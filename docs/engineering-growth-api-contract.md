# 工程成长闭环接口契约与实施决策

日期：2026-10-10。当前实现范围：M0 的旧矩阵清理、测试/兼容基础，以及 M1 问题定义。其余模型规则是后续实现基线，不表示接口已上线。

## 已实现：后端能力探测

`GET /api/capabilities` 需 JWT，返回 `{ "requirementDefinition": 1 }`。旧后端返回 404 时前端隐藏“创建并定义问题”，概览提示升级；普通需求、任务和 Wiki 可继续操作。检测失败提供重试，不冒充旧后端。

`VITE_ENGINEERING_GROWTH=false` 可在前端构建时关闭问题定义入口；默认开启。切换 serverUrl 重新检测，并忽略旧服务器迟到的响应。

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

## 后续批次的技术决策

以下为实施建议，需随对应批次测试与实际模型固定；不阻塞本批问题定义。

| 模块          | 基线                                                                                                 |
| ------------- | ---------------------------------------------------------------------------------------------------- |
| 阶段/任务扩展 | 可选目标、交付物、标准；省略保留，显式清空有独立语义；旧矩阵不再维护                                 |
| 决策/验证授权 | 需求访问继承；额外校验 stage/task/criterion 归属；不信任客户端作者字段                               |
| 决策状态      | PROPOSED / ACCEPTED / REJECTED / SUPERSEDED，替代保留原记录                                          |
| 验证          | PASS / FAIL / PARTIAL / INCONCLUSIVE / WAIVED，无记录未验证；WAIVED 必填原因；新一轮记录不覆盖旧结果 |
| 最新验证      | 明确有效性与修订/作废规则；按服务端记录顺序稳定排序；失效标准历史不证明当前标准 PASS                 |
| 时间线        | 使用已有审计事件和业务来源 ID，服务端筛选、稳定分页；详情查业务实体；不拼多个第一页                  |
| 收尾          | 独立一对一 closeout；只保存结论、处理方式和 Wiki ID，不重复 Wiki 全文；完成前检查事实版本            |
| Wiki          | 文档类型在 M5 加入；项目直接关联在 P2；默认不分享草稿或其来源                                        |
| 统一交互      | loading / empty / error / saved / unsaved / retry / conflict；保存失败保留输入                       |

## 数据迁移与发布

后端新增 `V1.0.6__requirement_definition.sql`，增加定义 JSONB、版本、确认时间/用户及个人需求审计支持。原 migration 不修改。dev/prod 均沿用 Flyway + Hibernate validate。

先升级后端数据库/API，再发布前端。升级前检查环境变量覆盖、迁移历史及备份，在测试副本演练。此开发过程未连接、修改仓库 dev 配置中的远程数据库，也未发布应用。

自动化数据库测试使用隔离 PostgreSQL 容器：先迁移至 V1.0.5 并放入旧数据，再启动应用升级至最新结构；同时验证 JSONB、个人审计、并发写冲突和旧实体并发修改。无 Docker 时明确跳过数据库集成测试，不视为迁移验收通过。

命令：前端 `npm test`、`npm run type-check`、`npm run build`；后端 `mvn verify`。集成测试文件为后端 `RequirementDefinitionIntegrationTest`。
