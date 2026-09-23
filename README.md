# Global Pay & Performance Decision Intelligence

依据 `Global_Pay_Performance_Decision_Intelligence_Phase2_PRD_V0.2.docx` 继续设计的 Phase 2 原型。产品从 Phase 1 的外部情报检索，扩展为可解释的跨市场比较、模式识别、设计选项、Scenario Lab、需求驱动的 Vendor Fit 和市场信号。

## 本地运行

需要 Python 3.10+，无第三方依赖：

```powershell
python server.py
```

打开 `http://127.0.0.1:8765`。服务只监听本机；首次运行自动创建 `intelligence.sqlite3`。也可以直接通过静态服务器打开 `index.html`、`styles.css` 和 `app.js`。

运行验证：

```powershell
python -m unittest discover -s tests -v
node --check app.js
```

## Phase 2 已实现

- Regional Intelligence：四市场矩阵、底层 Claim 状态、可信度、Common Practice、Market Difference 与 Evidence Gap。
- Company Archetype 数据结构：公司来源、规模、行业、Workforce 和 Operating Model；无法判断时保留 `Unknown`。
- Pattern Explorer：模式范围、组成、市场、Company Archetype、支持与反向证据、限制、状态及核验日期。
- Practice Design Library：绩效和销售激励结构、Potential Advantages、Trade-offs、Operational Complexity、Evidence 与 Limitation。
- Scenario Lab：输入轻量业务 Context，生成三个不排序的可选结构，明确展示证据、假设与缺口；不输出“推荐”或“最佳方案”。
- Vendor Fit：Requirement Builder、逐字段 Capability Coverage Matrix，以及针对 Partial / Unknown / Evidence Gap 的差异化 RFI 问题包；不计算供应商总分。
- Market Signals：Signal Strength、Direction、Supporting Evidence、Counter Signals、Confidence 与 Why It Matters。
- Phase 2 后端数据模型：`CompanyArchetype`、`RegionalPattern`、`DesignPattern`、`ContextProfile`、`Scenario`、`RequirementProfile`、`VendorFitRecord`、`RFIQuestion` 和 `MarketSignal`。
- Data Readiness Gate API：`/api/phase2/readiness`；在 Phase 1 覆盖、可追溯性、多来源验证与 Vendor Coverage 不达标时，明确阻止把 Phase 2 当作自动化结论层。

## 证据与决策边界

平台中的市场实践、供应商和 Phase 2 结果均为演示数据，不代表真实研究结论。Regional Pattern 必须回溯到底层 Claim 与 Source；Scenario 必须显示 Evidence、Assumptions、Trade-offs 和 Gaps；Vendor Fit 必须区分 Confirmed、Partial、Unknown、Capability Gap 和 Evidence Gap；Signal 必须同时保留 Supporting Evidence 与 Counter Signals。

平台不替用户制定薪酬或绩效政策，不对 Vendor 自动评分或选型，不使用外部市场信息做员工个人决策，不上传员工级薪酬或绩效数据，也不把 Company Archetype 当作企业必然相同的依据。最终判断归 HR、Legal、Finance、采购和业务负责人。

## 代码结构

```text
index.html            Phase 1 + Phase 2 工作台页面
styles.css            响应式界面与决策支持组件
app.js                演示数据、证据逻辑和交互流程
server.py             SQLite 数据模型、本地服务、Phase 1 API 与 Data Readiness Gate
tests/test_phase2.py  Phase 2 schema、静态入口和护栏验证
```

## 下一步生产化

在接入自动 Pattern Mining、Scenario Builder 或 Signal Detection 之前，应先满足 PRD 的 Data Readiness Gate，并增加身份认证、角色权限、审核流、审计日志、来源快照、版权管理、持久化 API、Prompt/Agent 版本控制和人工评估框架。
