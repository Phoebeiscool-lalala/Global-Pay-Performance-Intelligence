# Global Pay & Performance Intelligence

依据 `Global_Pay_Performance_Intelligence_PRD_V0.1.docx` 构建的本地 MVP 工作台。覆盖日本、韩国、中国香港和中国台湾，围绕 Practice Intelligence、Vendor Intelligence、Market Intelligence 三个模块组织可追溯情报。

## 运行

需要 Python 3.10+，无需安装第三方依赖。

```powershell
python server.py
```

浏览器打开 `http://127.0.0.1:8765`。首次启动会自动在项目目录创建 `intelligence.sqlite3`；可通过环境变量 `GPI_DB_PATH` 指定数据库位置、通过 `PORT` 更改端口。服务只监听本机回环地址，不应直接暴露到互联网。

运行测试：

```powershell
python -m unittest discover -s tests -v
```

## 已实现

- 四市场首页、PRD 对应的 Pay / Performance / Pay-for-Performance 研究分类和市场对比矩阵。
- Practice 记录以研究问题开始，默认 `Research candidate`，并非事实结论。可以录入公开来源的链接、机构、Tier、方向、原文摘录、发布日期和适用人群。
- 透明的辅助可信度评分：来源质量 30%、独立来源数 25%、一致性 20%、时效性 15%、适用范围 10%。仅 Tier 1–3 可以支持市场实践；Tier 4 Vendor 内容与 Tier 5 未核验内容不能单独建立市场结论。缺少发布日期不给时效分。单一来源不能达发布门槛；冲突证据强制标记。达到门槛后，仍需研究员人工审核和发布结论。
- 结论变更保留旧结论、新结论、原因、评分及日期；市场变化页只展示已发布的版本历史。
- Vendor 档案、逐市场能力状态和来源、2–5 家能力矩阵，以及针对 Unknown / Vendor Claimed / Conflicting 字段的 RFI 问题包。
- Ask Intelligence 仅检索 `Verified` 内部记录；没有证据时拒绝猜测，不伪装成已接入大模型或外部研究。
- SQLite 持久化和只监听本机的 JSON API；界面适配桌面和移动设备。

## 数据与产品边界

首次运行仅写入 4 个市场 × 8 个研究主题，共 32 个**待研究主题**。不预装未经证实的薪酬、绩效或供应商结论，不把营销内容当独立证据，不提供 P25/P50/P75 薪资基准、法律建议、个人薪酬决策、Payroll 计算或员工绩效评定。当前评分是 PRD 权重的可解释原型，不等于已验证的统计概率，也不自动判断来源是否真正独立。研究人员需审阅来源、适用市场、人群、日期和潜在偏差。

当前是本地研究原型：尚未实现认证、权限、审计日志、自动爬取、定时监测、外部 AI Agent、版权许可管理、通知和生产部署。生产化之前必须增加这些控制，并将研究数据与公开访问界面隔离。

## 代码结构

```text
server.py             SQLite schema、证据规则、JSON API、本地静态服务
static/index.html     工作台结构与导航
static/styles.css     响应式设计系统
static/app.js         页面交互、对比、证据录入和 RFI
tests/test_api.py     证据发布、冲突与供应商边界测试
```

## 下一阶段

按照 PRD Phase 0/1，先建立日本试点的 Source Registry、Practice Coverage 和 Vendor Seed List，经合法公开来源逐条采证；随后增加审核角色与审计日志、明确的独立性判定、来源快照和重核验队列。东亚扩展、AI Research Agent、持续监控与告警在验证试点数据质量后推进。
