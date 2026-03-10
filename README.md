# Azure DevOps Taskboard 說明文件

本工具為 Azure DevOps Kanban Board 的替代檢視介面，用於解決原生 Board 超過 1000 張卡片上限的問題。  
提供登入、看板瀏覽、拖曳改狀態、以及新增 Backlog / Task 等功能。

---

## 目錄

1. [產生 Azure DevOps Personal Access Token (PAT)](#1-產生-azure-devops-personal-access-token-pat)
2. [本地開發啟動方式](#2-本地開發啟動方式)
3. [Docker 部署方式](#3-docker-部署方式)
4. [系統操作說明](#4-系統操作說明)

---

## 1. 產生 Azure DevOps Personal Access Token (PAT)

1. 登入 [Azure DevOps](https://dev.azure.com/)。
2. 點選右上角個人頭像 `···` → `User settings` → `Personal access tokens`。
3. 點選 `+ New Token`。
4. 填寫名稱、設定到期日，並設定以下權限：

   | 權限項目 | 最低需求 |
   |----------|----------|
   | Work Items | **Read & Write** |
   | Project and Team | Read |

5. 點選 `Create`，複製產生的 Token（**離開頁面後無法再次查看**）。
6. 將 Token 貼到登入頁面的 `Token (PAT)` 欄位即可使用。

> ⚠️ Token 有效期最長 1 年，過期後需重新產生。

---

## 2. 本地開發啟動方式

### 環境需求

- Node.js **18+**
- npm **9+**

### 步驟

#### 啟動後端

```bash
cd board-app
npm install
node server.js
```

後端預設監聽 **port 3001**，啟動後會顯示：

```
✅ Board server → http://localhost:3001
```

#### 啟動前端（另開終端機）

```bash
cd board-app/client
npm install
npm run dev
```

前端預設監聽 **port 5173**，瀏覽器開啟：

```
http://localhost:5173
```

> 開發模式下，前端透過 Vite proxy 將 `/api/*` 請求轉發至 `http://localhost:3001`，前後端獨立熱更新。

---

## 3. Docker 部署方式

使用 multi-stage build，一個 image 同時包含前端靜態檔與後端 API。

### 建置 Image

```bash
cd board-app
docker build -t ado-board .
```

### 啟動容器

```bash
docker run -p 3001:3001 ado-board
```

瀏覽器開啟 **http://localhost:3001** 即可使用。

### 自訂 Port

```bash
docker run -p 8080:3001 ado-board
```

改用 http://localhost:8080 存取。

### 背景執行（daemon 模式）

```bash
docker run -d --name ado-board -p 3001:3001 ado-board
```

停止：

```bash
docker stop ado-board
```

重新啟動：

```bash
docker start ado-board
```

---

## 4. 系統操作說明

### 4.1 登入

開啟頁面後會進入登入畫面，填寫以下欄位：

| 欄位 | 說明 | 預設值 |
|------|------|--------|
| Organization | Azure DevOps 組織名稱 | `laash` |
| Project | 專案名稱 | `LaaS` |
| Team | 團隊名稱 | `LaaS Dev Team` |
| User | Azure DevOps 帳號（Email） | — |
| Token (PAT) | Personal Access Token | — |

填寫完畢後點選 **Sign In**，系統會驗證連線，成功後進入看板頁面。

---

### 4.2 看板頁面

#### 篩選器

| 控制項 | 功能 |
|--------|------|
| **Iteration**（多選） | 篩選 Sprint；不選代表顯示全部 |
| **Person**（多選） | 篩選指派對象；不選代表顯示全部 |
| **關鍵字搜尋** | 依 Title、Assigned To 或 ID 過濾卡片 |
| **State 下拉** | 篩選 To Do / In Progress / Done |
| **Clear** | 清除所有篩選條件 |

#### 看板欄位

每一列代表一個 Backlog（User Story / PBI / Feature / Bug），分成三欄：

| 欄位 | 對應 ADO 狀態 |
|------|--------------|
| **To Do** | To Do |
| **In Progress** | In Progress |
| **Done** | Done |

#### 收合 / 展開

- 點選列左側的 **▶ / ▼** 箭頭可收合或展開該列的 Task。
- 點選標題列的 **Collapse All / Expand All** 可一鍵全部收合或展開。

---

### 4.3 拖曳改變狀態

1. 滑鼠點住任一 Task 卡片（可拖曳）。
2. 拖曳至目標欄（**To Do**、**In Progress**、**Done**）後放開。
3. 系統會即時更新 ADO 上的 Task 狀態；若更新失敗會自動還原。

---

### 4.4 新增 Backlog

1. 點選篩選列左側的 **＋ New Backlog** 藍色按鈕。
2. 填寫以下欄位：

   | 欄位 | 必填 | 說明 |
   |------|------|------|
   | Type | ✓ | User Story / Product Backlog Item / Feature / Bug |
   | Title | ✓ | Backlog 標題 |
   | Iteration | — | 所屬 Sprint |
   | Assigned To | — | 指派對象 |
   | Story Point Level | — | 從下拉選單選擇（自動更新 Story Points） |
   | 需求來源 | ✓ | 自訂必填欄位 |
   | Start Date | — | 開始日期 |
   | Due Date | — | 到期日期 |
   | Description | — | 描述 |

3. 點選 **Create** 建立，成功後看板自動刷新。

---

### 4.5 新增 Task

1. 在任一 Backlog 列的左側卡片底部，點選虛線 **＋ Add Task** 按鈕。
2. 填寫以下欄位：

   | 欄位 | 必填 | 說明 |
   |------|------|------|
   | Title | ✓ | Task 標題 |
   | Iteration | — | 所屬 Sprint |
   | Assigned To | — | 指派對象 |
   | Estimated Hours | — | 預估工時 |
   | Remaining Work | ✓ | 剩餘工時 |
   | Start Date | ✓ | 開始日期 |
   | Due Date | ✓ | 到期日期 |
   | Description | — | 描述 |

3. 點選 **Create** 建立，成功後看板自動刷新並顯示於對應 Backlog 列下。

---

### 4.6 登出

點選右上角的 **Sign out** 按鈕，所有認證資訊清除，返回登入頁面。
