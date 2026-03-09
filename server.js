const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const DEFAULT_ORG = 'laash';
const DEFAULT_PROJECT = 'LaaS';
const DEFAULT_TEAM = 'LaaS Dev Team';

function getCredentials(req) {
  const org = req.headers['x-ado-org'] || DEFAULT_ORG;
  const project = req.headers['x-ado-project'] || DEFAULT_PROJECT;
  const team = req.headers['x-ado-team'] || DEFAULT_TEAM;
  const user = req.headers['x-ado-user'];
  const pat = req.headers['x-ado-pat'];
  if (!user || !pat) throw new Error('Missing x-ado-user or x-ado-pat header');
  const auth = `Basic ${Buffer.from(`${user}:${pat}`).toString('base64')}`;
  const base = `https://dev.azure.com/${org}/${project}`;
  return { org, project, team, auth, base };
}

async function adoGet(url, auth) {
  const res = await fetch(url, { headers: { Authorization: auth } });
  if (!res.ok) throw new Error(`ADO ${res.status}: ${await res.text()}`);
  return res.json();
}

async function adoPost(url, body, auth) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`ADO ${res.status}: ${await res.text()}`);
  return res.json();
}

async function fetchWorkItems(ids, auth, base, expand) {
  if (!ids.length) return [];
  const expandParam = expand ? `&$expand=${expand}` : '';
  const items = [];
  for (let i = 0; i < ids.length; i += 200) {
    const batch = ids.slice(i, i + 200);
    const data = await adoGet(
      `${base}/_apis/wit/workitems?ids=${batch.join(',')}&api-version=7.0${expandParam}`,
      auth
    );
    items.push(...(data.value || []));
  }
  return items;
}

// POST /api/validate — test credentials
app.post('/api/validate', async (req, res) => {
  try {
    const { org, project, auth } = getCredentials(req);
    await adoGet(`https://dev.azure.com/${org}/_apis/projects/${project}?api-version=7.0`, auth);
    res.json({ ok: true });
  } catch (e) {
    res.status(401).json({ error: e.message });
  }
});

// GET /api/iterations
app.get('/api/iterations', async (req, res) => {
  try {
    const { org, project, team, auth } = getCredentials(req);
    const encodedTeam = encodeURIComponent(team);
    const data = await adoGet(
      `https://dev.azure.com/${org}/${project}/${encodedTeam}/_apis/work/teamsettings/iterations?api-version=7.0`,
      auth
    );
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/team-members
app.get('/api/team-members', async (req, res) => {
  try {
    const { org, project, team, auth } = getCredentials(req);
    const encodedTeam = encodeURIComponent(team);
    const data = await adoGet(
      `https://dev.azure.com/${org}/_apis/projects/${project}/teams/${encodedTeam}/members?api-version=7.0`,
      auth
    );
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/board?iterationPath=...&assignedTo=...  (params can be repeated for multi-select)
app.get('/api/board', async (req, res) => {
  try {
    const { project, auth, base } = getCredentials(req);

    // Express parses repeated params as array; normalise to always be array
    const toArray = v => !v ? [] : Array.isArray(v) ? v : [v];
    const iterationPaths = toArray(req.query.iterationPath);
    const assignedTos    = toArray(req.query.assignedTo);

    const inList = (arr) => arr.map(v => `'${v.replace(/'/g, "''")}'`).join(', ');

    const where = [
      `[System.TeamProject] = '${project}'`,
      `[System.WorkItemType] = 'Task'`,
    ];
    if (iterationPaths.length === 1) {
      where.push(`[System.IterationPath] = '${iterationPaths[0].replace(/'/g, "''")}'`);
    } else if (iterationPaths.length > 1) {
      where.push(`[System.IterationPath] IN (${inList(iterationPaths)})`);
    }
    if (assignedTos.length === 1) {
      where.push(`[System.AssignedTo] = '${assignedTos[0].replace(/'/g, "''")}'`);
    } else if (assignedTos.length > 1) {
      where.push(`[System.AssignedTo] IN (${inList(assignedTos)})`);
    }

    const wiql = await adoPost(
      `${base}/_apis/wit/wiql?api-version=7.0`,
      { query: `SELECT [System.Id] FROM WorkItems WHERE ${where.join(' AND ')} ORDER BY [System.Id] DESC` },
      auth
    );

    const taskIds = (wiql.workItems || []).map(w => w.id);
    const rawTasks = await fetchWorkItems(taskIds, auth, base, 'relations');

    const parentIds = [
      ...new Set(
        rawTasks.flatMap(t =>
          (t.relations || [])
            .filter(r => r.rel === 'System.LinkTypes.Hierarchy-Reverse')
            .map(r => parseInt(r.url.split('/').pop()))
        )
      ),
    ];

    const rawParents = await fetchWorkItems(parentIds, auth, base);

    const parents = {};
    rawParents.forEach(p => {
      parents[p.id] = {
        id: p.id,
        title: p.fields['System.Title'] || '',
        state: p.fields['System.State'] || '',
        assignedTo: p.fields['System.AssignedTo']?.displayName || '',
        estimatedHours: p.fields['Microsoft.VSTS.Scheduling.OriginalEstimate'] || 0,
        storyPoints: p.fields['Microsoft.VSTS.Scheduling.StoryPoints'] || null,
        workItemType: p.fields['System.WorkItemType'] || '',
      };
    });

    const tasks = rawTasks.map(t => {
      const parentRel = (t.relations || []).find(r => r.rel === 'System.LinkTypes.Hierarchy-Reverse');
      const parentId = parentRel ? parseInt(parentRel.url.split('/').pop()) : null;
      return {
        id: t.id,
        title: t.fields['System.Title'] || '',
        state: t.fields['System.State'] || '',
        assignedTo: t.fields['System.AssignedTo']?.displayName || '',
        actualHours: t.fields['Custom.ActualHours'] || 0,
        estimatedHours: t.fields['Microsoft.VSTS.Scheduling.OriginalEstimate'] || 0,
        startDate: t.fields['Microsoft.VSTS.Scheduling.StartDate'] || null,
        dueDate: t.fields['Microsoft.VSTS.Scheduling.FinishDate'] || null,
        parentId,
        tags: t.fields['System.Tags'] || '',
      };
    });

    res.json({ tasks, parents });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/workitems/:id/state
app.patch('/api/workitems/:id/state', async (req, res) => {
  const { id } = req.params;
  const { state } = req.body;
  if (!state) return res.status(400).json({ error: 'state is required' });

  try {
    const { auth, base } = getCredentials(req);
    const patchBody = [{ op: 'replace', path: '/fields/System.State', value: state }];
    const response = await fetch(
      `${base}/_apis/wit/workitems/${id}?api-version=7.0`,
      {
        method: 'PATCH',
        headers: {
          Authorization: auth,
          'Content-Type': 'application/json-patch+json',
        },
        body: JSON.stringify(patchBody),
      }
    );
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`ADO ${response.status}: ${text}`);
    }
    const data = await response.json();
    res.json({ id: data.id, state: data.fields['System.State'] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`✅ Board server → http://localhost:${PORT}`));
