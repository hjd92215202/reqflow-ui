# 工程成长闭环接口契约与实施决策

日期：2026-10-11。当前实现范围：M0 的旧矩阵清理、测试/兼容基础、M1 问题定义、M2 阶段目标与任务交付标准，以及 M3 决策记录。其余模型规则是后续实现基线，不表示接口已上线。

## 已实现：后端能力探测

`GET /api/capabilities` 需 JWT，返回 `{ "requirementDefinition": 1, "executionStandards": 1, "decisionRecords": 1 }`。各功能独立检查能力；仅提供问题定义的后端不会开启 M2/M3。旧后端返回 404 时前端隐藏新功能编辑入口并提示升级；普通需求、任务和 Wiki 可继续操作。检测失败提供重试，不冒充旧后端。

`VITE_ENGINEERING_GROWTH=false` 可在前端构建时关闭问题定义、阶段目标、任务交付标准及决策入口；默认开启。切换 serverUrl 重新检测，并忽略旧服务器迟到的响应。

## 已实现：问题定义

| 方法 | 路径                                        | 请求                                    |
| ---- | ------------------------------------------- | --------------------------------------- |
| GET  | `/api/requirements/{id}/definition`         | 无                                      |
| PUT  | `/api/requirements/{id}/definition`         | `{ version, definition }`，完整替换内容 |
| POST | `/api/requirements/{id}/definition/confirm` | `{ version }`，确认已保存的当前版本     |

响应示例：

```json
{
  "definition": {
    "problemStatement": "要解决的问题",
    "targetOutcome": "期望结果",
    "constraints": [],
    "assumptions": [],
    "outOfScope": [],
    "successCriteria": [
      {
        "id": "stable-uuid",
        "description": "验收条件",
        "suggestedMethod": "验证方式",
        "targetValue": ""
      }
    ]
  },
  "state": "IN_PROGRESS",
  "version": 1,
  "confirmedAt": null,
  "confirmedBy": null
}
```

- `version` 是非负整数且必填。所有实际内容变更及首次确认都会递增；版本不符返回 409。内容完全相同的保存不递增、不撤销确认、不写重复审计。
- 客户端不能设置确认元数据；作者从 JWT 获取，时间从服务端获取。旧需求接口忽略定义及确认字段。
- 使用行写锁保护版本检查和写入。Requirement 采用动态更新，避免旧客户端的普通需求修改覆盖并发保存的新定义。
- `{}` 存量 JSON 规范化为空字符串/空数组；不从 description 自动推断。旧背景、日期、优先级、状态、projectId 保留。
- 文本裁剪首尾空白；问题和目标各最多 10000 字；三组文本列表各最多 50 条，每条最多 1000 字且非空；成功标准最多 50 条。
- 标准 ID 为 1～64 位字母、数字、下划线或连字符，需唯一；描述必填且最多 1000 字；建议方法/目标值可空，各最多 1000 字。
- 只保存部分字段也可以形成草稿；问题、目标、至少一条完整成功标准均存在后才能显式确认。
- 内容变更清空确认人/时间，记录 DEFINITION_UPDATE；首次确认记录 DEFINITION_CONFIRM。业务与审计同事务。无项目需求的日志 workspaceId 可为空，需求时间线依然可查询。
- 创建人或有权项目成员沿用需求访问授权；任务分配人身份本身不授予需求定义写权限。每个接口均在服务端校验。
- 响应状态为 NOT_STARTED / IN_PROGRESS / CONFIRMED。IN_PROGRESS 含“已填写但未确认”；不存百分比。
- 错误：401 未登录、403 无资源访问权限（不存在资源也可隐藏为 403）、400 参数错误/定义不完整、409 版本冲突。业务错误返回 `{status,message}`；JSON 解析错误由框架返回 400。
- 前端显式保存；失败保留输入；离开提示未保存；Tab 切换保留草稿。冲突后可读取最新内容比较，用户主动选择以最新内容替换或保留草稿，后者需再次保存才写回。
- 标准重排保留 ID；前端修改描述、验证方法或目标值后产生新 ID。后续验证模型必须同时存标准快照，服务端验证关联有效性；M1 尚不提供验证接口。

## 已实现：阶段目标与任务交付标准

沿用现有 CRUD，不增加额外资源：

| 模型    | 新增可选字段                             | 创建 / 局部更新                                | 列表读取                                      |
| ------- | ---------------------------------------- | ---------------------------------------------- | --------------------------------------------- |
| Stage   | `goal`、`expectedOutput`、`exitCriteria` | POST `/api/stages`、PUT `/api/stages/{id}`     | GET `/api/stages/requirement/{requirementId}` |
| SubTask | `deliverable`、`completionCriteria`      | POST `/api/subtasks`、PUT `/api/subtasks/{id}` | GET `/api/subtasks/stage/{stageId}`           |

- 新字段为 nullable TEXT；不从标题、备注或旧 JSONB 自动推断。省略字段保留原值；显式 `null`、空串或纯空白清空；其他文本裁剪首尾空白。每个字段原始输入最多 10000 个 UTF-16 字符，超限返回 400。
- Stage 更新只修改传入的字段。SubTask 更新使用 presence-aware DTO：省略负责人、日期、备注、自定义字段均保留；显式 null 清空，自定义字段 null 转为空对象。title/status 的 null 沿用保留语义；更新不能变更所属阶段/父任务。
- 创建仍沿用需求访问授权；创建子任务时校验父任务属于同一阶段。读写标准与普通阶段/任务使用同一权限，不允许仅凭任务分配身份编辑标准。
- 创建忽略客户端传入的 ID，始终由数据库分配，防止 POST 合并覆盖已有阶段/任务；字段传入标记只由 JSON setter 生成，客户端不能伪造。
- Stage/SubTask 使用动态更新，避免旧实体的并发状态、日期或标题修改覆盖新增标准。普通待办更新/打勾保留标准；空标准不会阻止任务 DONE，也不会自动创建验证记录。
- 保存及审计在同一事务；只改标准归为 UPDATE，真正修改状态才归为 STATUS。待验证数仍待 M4。
- 阶段弹窗保存成功后关闭，失败保留输入；未调整日期时保留单侧旧日期。阶段列表展示目标摘要及全树工作项已完成/总数，缓存缺失时显示尚未加载。
- 任务创建的选填区默认收起；详情的交付标准独立编辑、显式保存，失败重试不覆盖草稿。草稿在工作区内保留以支持面板尺寸变化；取消或路由离开时确认丢弃，保存中阻止离开，关闭窗口提示未保存。
- 普通任务编辑请求不携带新字段；交付标准保存只传标准字段。同任务的写入按顺序执行，响应更新任务树缓存；旧响应未带标准时保留已有标准，响应 null 才清空。
- M2 不提供标准版本冲突检测；同一标准被多个客户端编辑时，以最后完成的写入为准。后续验证仍需标准快照与有效性规则。

## 已实现：决策记录

全部接口继承 JWT 与需求访问权限，路径中的 `{requirementId}` 限定资源归属。

| 方法 | 路径                                                         | 请求 / 行为                                                                                          |
| ---- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| GET  | `/api/requirements/{requirementId}/decisions`                | 可选 `stageId`、`subTaskId`、`status`；`page` 最小 0，`size` 默认 20、裁剪至 1～100；返回 PageResult |
| GET  | `/api/requirements/{requirementId}/decisions/{id}`           | 返回内容、版本、作者/时间、上下文快照及双向替代 ID                                                   |
| POST | `/api/requirements/{requirementId}/decisions`                | `{ stageId?, subTaskId?, content }`；创建，版本从 0 开始                                             |
| PUT  | `/api/requirements/{requirementId}/decisions/{id}`           | `{ version, content }`；完整替换内容，不能修改上下文或身份                                           |
| POST | `/api/requirements/{requirementId}/decisions/{id}/supersede` | `{ version, content }`；创建已采纳的新决策，返回新记录                                               |

`content` 示例：

```json
{
  "title": "缓存方案选择",
  "context": "降低重复读取延迟",
  "options": [{ "name": "本地缓存", "pros": "实现简单", "cons": "多实例一致性需要处理" }],
  "chosenOption": "本地缓存",
  "rationale": "当前单实例，先验证收益",
  "assumptions": ["访问存在明显重复"],
  "confidence": "MEDIUM",
  "status": "ACCEPTED",
  "reviewDate": "2026-10-20",
  "aiAssistance": {
    "phases": ["COMPARISON"],
    "contribution": "列出两种缓存的代价",
    "humanJudgment": "核对部署规模与维护成本",
    "handling": "MODIFIED",
    "verification": "通过集成测试及压测检查"
  }
}
```

- 标题和背景必填；拟议 PROPOSED 可不填最终选择，采纳 ACCEPTED 须有最终选择与理由，否决 REJECTED 须有理由。SUPERSEDED 只能由替代事务产生，并成为只读记录。其余状态可通过显式编辑变更；本批无审批流。
- 替代仅针对已采纳记录，新决策也须为 ACCEPTED。持有原记录写锁并检查非负必填版本；创建新记录、旧记录标为 SUPERSEDED、互写替代 ID、两条审计在同一事务完成。旧内容保留，不能重复替代。新记录继承原上下文，不能通过请求换绑。
- 创建时检查阶段属于当前需求，任务属于该阶段；只传任务 ID 时由服务端取得阶段。作者与时间由服务端生成，阶段/任务名称由数据库快照取得；客户端元数据不参与写入。需求创建人和授权项目成员可读写，分配任务身份不单独授予权限。
- 同版本、相同内容的保存不递增、不重复审计；实际编辑递增版本。创建/普通编辑/采纳/否决/替代分别记录 DECISION_CREATE/UPDATE/ACCEPT/REJECT/SUPERSEDE；业务与审计同事务。列表按 `createdAt DESC, id DESC` 稳定排序。
- 标题最多 255 个 UTF-16 字符，背景、最终选择、理由各最多 10000；候选方案最多 20 个，名称必填且最多 1000，优点/代价可空且各最多 10000；假设/风险最多 50 条，每条非空且最多 1000。信心可空或 LOW/MEDIUM/HIGH，复查日期可空或 ISO 日期。
- AI 说明选填且由用户记录，不调用 AI 服务、不评分、不自动认定验证通过。环节为 CLARIFICATION/COMPARISON/CODING/TEST_DESIGN/DOCUMENTATION/OTHER，不能重复；处理方式可空或 ACCEPTED/MODIFIED/REJECTED/BRAINSTORMING；贡献、人工判断、验证方式各最多 10000。空说明规范化为 null。
- 删除任务/阶段时对应 ID 置 null，决策及上下文名称快照保留，仍可从需求概览查看、编辑或替代；删除整个需求时决策一并删除。暂不提供单独删除决策接口。普通编辑只有审计摘要，不保存每次内容修订全文；被替代的旧决策全文保留。
- 错误：401 未登录，403 无访问权限或不存在，400 参数/归属错误，409 版本冲突、只读记录、重复替代或并发上下文变化。业务错误为 `{status,message}`。
- 前端在概览、阶段列表、任务详情提供入口；共用抽屉支持上下文/状态筛选、分页、显式保存、失败重试、409 比较及离开保护。保存中阻止导航，草稿不写入本地持久化；切换服务器或需求清空旧上下文并忽略迟到响应。深链接使用现有工作区路径的 `decisionId` 查询参数，保留其他查询参数。
- 活动中的决策来源可打开详情，当前活动页在决策保存成功后重新加载。统一时间线的服务端筛选/分页仍待 M5，本批只实现决策列表分页和已有活动的来源跳转。

## 后续批次的技术决策

以下为实施建议，需随后续批次测试与实际模型固定。

| 模块     | 基线                                                                                                 |
| -------- | ---------------------------------------------------------------------------------------------------- |
| 验证授权 | 需求访问继承；额外校验 stage/task/criterion 归属；不信任客户端作者字段                               |
| 验证     | PASS / FAIL / PARTIAL / INCONCLUSIVE / WAIVED，无记录未验证；WAIVED 必填原因；新一轮记录不覆盖旧结果 |
| 最新验证 | 明确有效性与修订/作废规则；按服务端记录顺序稳定排序；失效标准历史不证明当前标准 PASS                 |
| 时间线   | 使用已有审计事件和业务来源 ID，服务端筛选、稳定分页；详情查业务实体；不拼多个第一页                  |
| 收尾     | 独立一对一 closeout；只保存结论、处理方式和 Wiki ID，不重复 Wiki 全文；完成前检查事实版本            |
| Wiki     | 文档类型在 M5 加入；项目直接关联在 P2；默认不分享草稿或其来源                                        |
| 统一交互 | loading / empty / error / saved / unsaved / retry / conflict；保存失败保留输入                       |

## 数据迁移与发布

后端新增 `V1.0.6__requirement_definition.sql`，增加定义 JSONB、版本、确认时间/用户及个人需求审计支持；`V1.0.7__execution_standards.sql` 增加阶段/任务的五个 nullable TEXT 列；`V1.0.8__decision_records.sql` 增加决策、上下文快照、替代关联、版本及索引。原 migration 不修改。dev/prod 均沿用 Flyway + Hibernate validate。

先升级后端数据库/API，再发布前端。升级前检查环境变量覆盖、迁移历史及备份，在测试副本演练。此开发过程未连接、修改仓库 dev 配置中的远程数据库，也未发布应用。

自动化数据库测试使用隔离 PostgreSQL 容器：分别从 V1.0.5/V1.0.7 存量需求、阶段、任务升级至 V1.0.8；验证 JSONB、审计、并发版本冲突、标准 CRUD、权限、字段长度、显式清空、任务层级、普通待办更新、旧实体并发修改，以及决策状态、替代竞争、审计回滚、关联删除历史保留和稳定分页。无 Docker 时明确跳过数据库集成测试，不视为迁移验收通过。

命令：前端 `npm test`、`npm run type-check`、`npm run build`；后端 `mvn verify`。集成测试文件为后端 `RequirementDefinitionIntegrationTest`、`DecisionIntegrationTest`。
