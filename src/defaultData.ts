import { Prompt } from './types';

export const DEFAULT_PROMPTS: Prompt[] = [
    {
        id: "1722394801001",
        title: '需求快速整理器',
        content: '我有一个项目想法，请帮我快速整理需求：\n\n## 项目想法\n[描述你的项目想法，如：想做一个在线学习平台]\n\n## 请帮我整理出：\n1. **核心功能**（3-5个主要功能）\n2. **目标用户**（谁会使用这个产品）\n3. **主要页面**（需要哪些页面）\n4. **技术建议**（推荐的技术栈）\n5. **开发优先级**（先做什么，后做什么）\n\n请用简洁明了的语言，帮助我快速理解项目全貌。',
        category: '快速入门',
        tags: ["快速开始", "需求整理", "项目规划", "入门指导"],
        isFavorite: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1
    },
    {
        id: "1722394801002",
        title: 'UI界面快速设计器',
        content: '请为我设计一个[应用类型，如：任务管理APP]的界面：\n\n## 基本信息\n- 应用名称：[应用名称]\n- 主要功能：[核心功能描述]\n- 目标用户：[用户群体，如：上班族、学生]\n\n## 设计要求\n- 风格：[现代简洁/商务专业/年轻活泼]\n- 颜色：[主色调偏好]\n- 重点页面：[首页/列表页/详情页等]\n\n## 请提供\n1. 整体设计风格建议\n2. 色彩搭配方案\n3. 主要页面布局描述\n4. 关键交互说明\n5. 可以直接使用的CSS样式代码\n\n请确保设计简洁易用，适合快速开发。',
        category: '快速入门',
        tags: ["快速开始", "UI/UX设计", "CSS", "入门指导"],
        isFavorite: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1
    },
    {
        id: "1722394801003",
        title: '代码快速生成器',
        content: '请帮我生成[功能描述，如：用户登录页面]的代码：\n\n## 需求说明\n- 技术栈：[Vue/React/原生HTML等]\n- 功能：[具体功能描述]\n- 样式要求：[简洁/美观/响应式等]\n\n## 请提供\n1. 完整的HTML结构\n2. CSS样式代码\n3. JavaScript交互逻辑\n4. 简要的使用说明\n5. 常见问题解决方案\n\n要求代码简洁易懂，可以直接运行使用。',
        category: '快速入门',
        tags: ["快速开始", "代码生成", "前端开发", "HTML", "入门指导"],
        isFavorite: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1
    },
    {
        id: "1722394801004",
        title: '开发问题解决器',
        content: '遇到开发问题，需要快速解决：\n\n## 问题描述\n[详细描述遇到的问题]\n\n## 当前环境\n- 技术栈：[使用的技术]\n- 错误信息：[如有错误信息请贴出]\n- 已尝试方法：[已经试过的解决方法]\n\n## 期望帮助\n1. 问题原因分析\n2. 具体解决步骤\n3. 代码示例（如需要）\n4. 预防类似问题的建议\n5. 相关学习资源推荐\n\n请提供简洁有效的解决方案。',
        category: '快速入门',
        tags: ["快速开始", "问题解决", "Debug", "技术支持", "入门指导"],
        isFavorite: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1
    },
    {
        id: "1722394801005",
        title: '需求分析与PRD专家',
        content: '你是一位资深的产品需求分析师，擅长将客户想法转化为清晰的产品需求文档。\n\n请帮我完成从客户想法到PRD文档的完整流程：\n\n## 项目背景\n[描述客户的基本想法和业务背景，如：想开发一个餐厅管理系统，解决点餐和库存管理问题]\n\n## 分析流程\n\n### 第一阶段：需求收集\n1. **客户访谈准备**\n   - 访谈问题设计（开放式+封闭式）\n   - 访谈流程规划\n   - 信息记录模板\n   - 后续跟进计划\n\n2. **深度需求挖掘**\n   - 业务场景分析\n   - 用户角色识别\n   - 使用流程梳理\n   - 痛点问题收集\n\n### 第二阶段：需求整理\n1. **信息分类整理**\n   - 功能性需求提取\n   - 非功能性需求识别\n   - 约束条件梳理\n   - 假设前提记录\n\n2. **需求优先级排序**\n   - MoSCoW优先级方法\n   - 价值-复杂度矩阵\n   - 用户影响评估\n   - 技术实现难度\n\n### 第三阶段：PRD文档编写\n1. **文档结构规划**\n   - 产品概述\n   - 用户分析\n   - 功能需求详述\n   - 非功能需求\n   - 验收标准\n   - 风险评估\n\n2. **需求描述规范**\n   - 用户故事格式\n   - 验收条件定义\n   - 业务规则说明\n   - 异常处理方案\n\n## AI工具使用建议\n- **Cursor AI**：需求信息结构化整理\n- **Claude**：用户故事自动生成、业务流程分析\n- **Flowith**：业务流程图绘制\n- **Notion**：需求文档管理和协作\n\n## 输出内容\n1. 客户访谈记录和分析\n2. 结构化需求分析报告\n3. 用户故事地图\n4. 完整PRD文档\n5. 需求验证清单\n6. 项目风险评估报告\n\n请确保需求分析全面准确，PRD文档清晰可执行。',
        category: '产品需求',
        tags: ["需求分析", "PRD文档", "产品规划", "用户研究", "用户故事"],
        isFavorite: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1
    },
    {
        id: "1722394801006",
        title: 'UI/UX设计与原型专家',
        content: '你是一位专业的UI/UX设计师，精通从信息架构到高保真原型的完整设计流程。\n\n请为[产品名称，如：智能健身追踪APP]设计完整的UI/UX方案：\n\n## 设计需求\n[详细描述产品定位、目标用户、核心功能，如：面向健身爱好者的运动数据追踪和社交分享平台]\n\n## 设计流程\n\n### 第一阶段：信息架构设计\n1. **内容结构梳理**\n   - 功能模块划分\n   - 信息层级设计\n   - 导航结构规划\n   - 内容组织逻辑\n\n2. **用户流程设计**\n   - 主要任务流程\n   - 用户决策路径\n   - 异常流程处理\n   - 流程优化建议\n\n### 第二阶段：原型设计\n1. **低保真原型**\n   - 页面布局框架\n   - 功能模块分布\n   - 交互流程验证\n   - 可用性测试\n\n2. **高保真原型**\n   - 视觉设计应用\n   - 交互细节完善\n   - 动效设计规划\n   - 响应式适配\n\n### 第三阶段：多风格设计系统\n1. **现代简约风格**\n   - 纯净白色背景，大量留白\n   - 简洁线条和几何图形\n   - 单色或双色配色方案\n   - 清晰的层次结构\n\n2. **玻璃拟态风格**\n   - 半透明背景：rgba(255,255,255,0.1)\n   - 毛玻璃效果：backdrop-filter: blur(10px)\n   - 柔和边框和阴影\n   - 渐变色彩点缀\n\n3. **深色主题风格**\n   - 深色背景：#1a1a1a, #2d2d2d\n   - 高对比度文字\n   - 彩色强调元素\n   - 护眼设计考虑\n\n4. **商务专业风格**\n   - 蓝色系主色调\n   - 规整的网格布局\n   - 专业图标系统\n   - 数据可视化元素\n\n## 技术实现建议\n- **CSS框架**：Tailwind CSS, Bootstrap\n- **组件库**：Ant Design, Element UI, Material-UI\n- **原型工具**：Figma, Sketch, Adobe XD\n- **代码生成**：Cursor AI, GitHub Copilot\n\n## 输出内容\n1. 信息架构图和用户流程图\n2. 低保真线框图\n3. 高保真视觉设计稿\n4. 设计系统文档（颜色、字体、组件）\n5. 交互原型演示\n6. 响应式设计方案\n7. 前端开发标注和切图\n8. 多风格设计变体\n\n请确保设计美观实用，符合现代UI/UX标准和用户体验最佳实践。',
        category: '设计创意',
        tags: ["UI/UX设计", "原型设计", "设计系统", "信息架构", "线框图"],
        isFavorite: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1
    },
    {
        id: "1722394801007",
        title: '技术开发与实现专家',
        content: '你是一位资深的全栈开发架构师，精通现代Web开发技术栈和项目管理。\n\n请为[项目名称，如：电商管理系统]制定完整的技术开发方案：\n\n## 项目背景\n[描述项目需求、技术要求、团队情况，如：需要开发一个支持多商户的电商平台，团队有3名前端和2名后端开发者]\n\n## 技术架构设计\n\n### 1. 技术栈选择\n**前端技术栈**：\n- **Vue.js生态**：Vue 3 + Vite + Pinia + Vue Router\n- **React生态**：React 18 + Next.js + Redux Toolkit + React Router\n- **Angular生态**：Angular 15+ + RxJS + NgRx\n\n**后端技术栈**：\n- **PHP**：Laravel 10+ / ThinkPHP 8+ / Symfony\n- **Node.js**：Express.js / Nest.js / Koa.js\n- **Python**：Django / FastAPI / Flask\n- **Java**：Spring Boot / Spring Cloud\n\n**数据库方案**：\n- **关系型**：MySQL 8.0+ / PostgreSQL\n- **NoSQL**：MongoDB / Redis\n- **搜索引擎**：Elasticsearch\n\n### 2. 架构设计原则\n- **微服务架构**：服务拆分和通信\n- **前后端分离**：API设计和接口规范\n- **容器化部署**：Docker + Kubernetes\n- **CI/CD流程**：自动化构建和部署\n\n### 3. AI辅助开发最佳实践\n\n**Cursor AI使用技巧**：\n```javascript\n// 组件生成示例\n// @cursor: 生成一个Vue3的用户列表组件，包含搜索、分页、编辑功能\n```\n\n**代码生成模板**：\n```php\n// PHP API接口模板\n// @cursor: 生成ThinkPHP的RESTful API，包含CRUD操作和参数验证\n```\n\n**数据库设计辅助**：\n```sql\n-- @cursor: 根据需求生成数据库表结构和索引优化\n```\n\n### 4. 开发计划和任务分解\n\n**第一阶段：基础架构搭建**\n- 项目初始化和环境配置\n- 基础框架搭建\n- 数据库设计和初始化\n- API接口设计\n\n**第二阶段：核心功能开发**\n- 用户系统开发\n- 核心业务逻辑实现\n- 前端页面开发\n- 接口联调测试\n\n**第三阶段：功能完善和优化**\n- 性能优化\n- 安全加固\n- 测试完善\n- 部署上线\n\n### 5. 质量保证和最佳实践\n\n**代码规范**：\n- ESLint + Prettier（前端）\n- PHP-CS-Fixer（PHP后端）\n- 统一的Git提交规范\n\n**测试策略**：\n- 单元测试：Jest / PHPUnit\n- 集成测试：Cypress / Postman\n- 性能测试：JMeter\n\n## 输出内容\n1. 技术架构设计文档\n2. 数据库设计文档和ER图\n3. API接口设计文档\n4. 前端组件库和设计系统\n5. 后端服务架构和部署方案\n6. 开发环境配置指南\n7. 项目开发计划和里程碑\n8. 质量保证和测试方案\n9. 部署运维文档\n10. 团队协作规范\n\n请确保技术方案具有前瞻性，适合团队技术水平，并能支撑业务长期发展。',
        category: '技术实现',
        tags: ["全栈开发", "架构设计", "代码生成", "项目管理", "微服务", "容器化", "CI/CD"],
        isFavorite: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1
    },
    {
        id: "1722394801008",
        title: 'Vue2+FastAdmin开发指南',
        content: '你是一位经验丰富的PHP全栈开发工程师，精通Vue2和FastAdmin框架开发。\n\n请为[项目名称]制定完整的开发方案：\n\n## 项目背景\n[详细描述项目需求、功能模块、技术要求]\n\n## 技术架构\n- **前端技术栈**：Vue2 + Element UI + Axios\n- **后端技术栈**：FastAdmin + ThinkPHP + MySQL\n- **开发环境**：推荐使用Cursor AI辅助开发\n\n## 开发流程\n\n### 1. 环境配置\n- **FastAdmin安装**：下载最新版本，配置数据库连接\n- **前端环境**：配置Node.js和npm，安装Vue CLI\n- **开发工具**：推荐使用Cursor + Chrome + Git\n\n### 2. 后端开发\n- **数据库设计**：根据需求设计表结构和关系\n- **API接口开发**：使用FastAdmin的控制器和模型\n- **权限管理**：配置用户权限和角色管理\n- **数据验证**：添加必要的数据验证规则\n\n### 3. 前端开发\n- **组件化开发**：基于Element UI构建可复用组件\n- **状态管理**：使用Vuex管理应用状态\n- **路由配置**：配置Vue Router实现页面跳转\n- **API集成**：使用Axios与后端API通信\n\n### 4. 关键配置\n```php\n// FastAdmin配置示例\n\'database\' => [\n    \'type\'     => \'mysql\',\n    \'hostname\' => \'localhost\',\n    \'database\' => \'your_database\',\n    \'username\' => \'your_username\',\n    \'password\' => \'your_password\',\n],\n```\n\n```javascript\n// Vue配置示例\nimport Vue from \'vue\'\nimport ElementUI from \'element-ui\'\nimport \'element-ui/lib/theme-chalk/index.css\'\n\nVue.use(ElementUI)\n```\n\n## AI辅助开发建议\n- **使用Cursor AI**：生成控制器、模型和视图代码\n- **代码优化**：让AI帮助优化SQL查询和前端性能\n- **问题解决**：遇到问题时向AI寻求解决方案\n\n## 注意事项\n- 确保FastAdmin版本兼容性\n- 注意前后端数据格式统一\n- 做好错误处理和用户体验优化\n- 定期备份数据库和代码\n\n请确保开发方案完整可执行，能够指导实际项目开发。',
        category: '技术实现',
        tags: ["Vue", "FastAdmin", "PHP", "ThinkPHP", "Element UI", "Web开发"],
        isFavorite: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1
    },
    {
        id: "1722394801009",
        title: '现代Web技术栈开发方案',
        content: '你是一位资深的全栈架构师，请为[项目类型]制定现代化的技术开发方案：\n\n## 项目需求分析\n[详细描述项目背景、功能需求、性能要求、团队情况]\n\n## 技术栈选择\n\n### 前端方案\n**React生态系统**：\n- **核心框架**：React 18 + TypeScript\n- **状态管理**：Redux Toolkit + RTK Query\n- **路由管理**：React Router v6\n- **UI组件库**：Ant Design / Material-UI / Chakra UI\n- **构建工具**：Vite / Next.js\n- **样式方案**：Tailwind CSS / Styled Components\n\n**Vue生态系统**：\n- **核心框架**：Vue 3 + TypeScript\n- **状态管理**：Pinia / Vuex\n- **路由管理**：Vue Router 4\n- **UI组件库**：Element Plus / Vuetify / Quasar\n- **构建工具**：Vite / Nuxt.js\n- **样式方案**：Tailwind CSS / SCSS\n\n### 后端方案\n**Node.js生态**：\n- **框架选择**：Express.js / Nest.js / Fastify\n- **数据库ORM**：Prisma / TypeORM / Sequelize\n- **API设计**：RESTful API / GraphQL\n- **身份验证**：JWT / Passport.js / Auth0\n\n**Python生态**：\n- **框架选择**：FastAPI / Django / Flask\n- **数据库ORM**：SQLAlchemy / Django ORM\n- **异步处理**：Celery / asyncio\n- **API文档**：Swagger / OpenAPI\n\n**Java生态**：\n- **框架选择**：Spring Boot / Spring Cloud\n- **数据库访问**：MyBatis / JPA\n- **微服务架构**：Spring Cloud Gateway\n- **安全框架**：Spring Security\n\n### 数据库方案\n**关系型数据库**：\n- **PostgreSQL**：功能强大，支持JSON，适合复杂查询\n- **MySQL**：成熟稳定，适合传统应用\n- **SQLite**：轻量级，适合小型应用和开发测试\n\n**NoSQL数据库**：\n- **MongoDB**：文档数据库，适合灵活数据结构\n- **Redis**：内存数据库，适合缓存和会话存储\n- **Elasticsearch**：搜索引擎，适合全文搜索\n\n## 架构设计\n\n### 1. 微服务架构\n- **服务拆分**：按业务域拆分服务\n- **API网关**：统一入口和路由管理\n- **服务发现**：Consul / Eureka / Kubernetes\n- **负载均衡**：Nginx / HAProxy / Cloud Load Balancer\n\n### 2. 容器化部署\n- **容器技术**：Docker + Docker Compose\n- **编排工具**：Kubernetes / Docker Swarm\n- **镜像管理**：Docker Hub / Harbor / AWS ECR\n- **配置管理**：ConfigMap / Secret\n\n### 3. CI/CD流程\n- **版本控制**：Git + GitHub/GitLab\n- **持续集成**：GitHub Actions / GitLab CI / Jenkins\n- **自动化测试**：Jest / Cypress / Selenium\n- **部署策略**：蓝绿部署 / 金丝雀发布\n\n## 开发最佳实践\n\n### 1. 代码质量\n- **代码规范**：ESLint + Prettier / SonarQube\n- **类型检查**：TypeScript / Flow\n- **单元测试**：Jest / Vitest / Mocha\n- **集成测试**：Cypress / Playwright / Postman\n\n### 2. 性能优化\n- **前端优化**：代码分割、懒加载、CDN\n- **后端优化**：数据库索引、查询优化、缓存策略\n- **监控告警**：Prometheus + Grafana / ELK Stack\n\n### 3. 安全措施\n- **身份验证**：OAuth 2.0 / OpenID Connect\n- **数据加密**：HTTPS / 数据库加密\n- **安全扫描**：OWASP ZAP / Snyk\n- **访问控制**：RBAC / ABAC\n\n## AI辅助开发策略\n- **代码生成**：GitHub Copilot / Cursor AI / Tabnine\n- **代码审查**：AI辅助代码质量检查\n- **测试生成**：AI生成单元测试和集成测试\n- **文档生成**：AI自动生成API文档和技术文档\n\n## 项目管理\n- **敏捷开发**：Scrum / Kanban\n- **项目工具**：Jira / Trello / Linear\n- **沟通协作**：Slack / Microsoft Teams / 飞书\n- **文档管理**：Confluence / Notion / GitBook\n\n请基于以上技术方案，结合项目实际需求，制定详细的开发计划和实施方案。',
        category: '技术实现',
        tags: ["React", "Vue", "Node.js", "Python", "Java", "微服务", "架构设计", "Web开发"],
        isFavorite: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1
    },
    {
        id: "1722394801010",
        title: 'APP原型快速生成器',
        content: '你是一位全栈工程师，同时精通产品规划和UI设计。\n\n请为[应用类型，如：精力管理APP]设计完整的高保真原型：\n\n## 设计需求\n- **应用类型**：[具体描述应用功能和目标用户]\n- **设计风格**：[现代简约/商务专业/年轻活泼/玻璃拟态/轻拟物等]\n- **技术要求**：响应式设计，符合iOS/Android设计规范\n\n## 设计流程\n1. **用户体验分析**：分析核心功能和用户需求，确定交互逻辑\n2. **产品界面规划**：定义关键界面，确保信息架构合理\n3. **高保真UI设计**：符合现代设计规范，具有良好视觉体验\n4. **HTML原型实现**：使用HTML + Tailwind CSS生成所有界面\n\n## 技术规格\n- **文件结构**：每个界面独立HTML文件，index.html作为主入口\n- **布局方式**：使用iframe嵌入所有页面，平铺展示\n- **设备规格**：模拟iPhone 15 Pro尺寸，包含圆角边框和状态栏\n- **视觉资源**：使用真实UI图片（Unsplash/Pexels），避免占位图\n- **图标系统**：整合FontAwesome图标库\n\n## 输出要求\n- 完整的HTML代码，可直接用于开发\n- 界面美观且符合现代设计趋势\n- 交互逻辑清晰，用户体验流畅\n- 代码结构清晰，便于后续开发\n\n请确保设计既美观又实用，能真实反映现代APP的设计标准。',
        category: '设计创意',
        tags: ["APP设计", "高保真原型", "HTML", "Tailwind CSS", "UI/UX设计"],
        isFavorite: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1
    },
    {
        id: "1722394801011",
        title: '多风格UI设计生成器',
        content: '作为资深APP UI设计师，请为[产品名称]创建完整的UI界面设计方案：\n\n## 产品概述\n[详细描述产品定位、目标用户、核心功能]\n\n## 设计风格选择（请选择一种）\n\n### 1. 玻璃拟态风格 (Glassmorphism)\n- **背景效果**：半透明背景 rgba(255,255,255,0.1)，毛玻璃效果 backdrop-filter: blur(10px)\n- **边框处理**：柔和边框 1px solid rgba(255,255,255,0.2)，模拟光感边缘\n- **阴影系统**：柔和内阴影和外发光，营造悬浮感\n- **配色方案**：温暖米白背景 #F8F4F0，深灰文字 #4A4A4A，橙色点缀 #FF7F50\n\n### 2. 晶白风格 (Crystal White)\n- **核心元素**：白色到透明的线性渐变，利用透明度拉开层次\n- **边缘界定**：极细浅色边框或柔和内阴影界定轮廓\n- **投影发光**：柔和投影和外发光体现悬浮感和层级关系\n- **配色系统**：纯白主导，深灰文字，橙色强调色\n\n### 3. 霓虹渐变风格 (Neon Gradient)\n- **霓虹渐变**：高饱和度紫、蓝、洋红渐变色组合\n- **发光效果**：box-shadow或filter实现同色系柔和发光\n- **深邃背景**：深蓝 #0A0F2C、深紫 #2C0A2C或近黑色背景\n- **配色方案**：白色文字，霓虹强调色，高对比度设计\n\n### 4. 插画手绘风格 (Hand-Drawn Illustration)\n- **表现力插画**：粗犷线条或富有表现力的手绘插画\n- **有机形态**：轻微不规则边缘，手绘轮廓线，纸张纹理背景\n- **配色方案**：饱和对比强烈的色彩，深褐色文字，鲜明强调色\n- **字体选择**：手写体标题，简约无衬线正文\n\n### 5. 孟菲斯风格 (Memphis Design)\n- **大胆几何**：鲜明几何形状随机非对称组合\n- **经典图案**：波浪线、锯齿线、粗条纹、密集点阵\n- **撞色搭配**：高饱和度明亮色彩，大胆撞色组合\n- **扁平层级**：明确色块边界，粗线条轮廓，硬边缘阴影\n\n## 技术实现\n- **输出格式**：单个完整HTML文件，内嵌CSS和JS\n- **布局规格**：每行6个页面预览，375x812px尺寸\n- **图标系统**：SVG <symbol>技术定义矢量图标\n- **动效实现**：CSS动画和过渡效果\n- **图片策略**：Picsum Photos固定ID或美观SVG占位符\n\n## 输出内容\n1. 完整UI设计方案和技术规格\n2. 结构清晰的HTML完整代码\n3. 符合现代UI/UX标准的设计\n4. 可直接在浏览器中运行的代码\n\n请确保设计美观实用，符合选定风格的所有特征要求。',
        category: '设计创意',
        tags: ["APP设计", "UI/UX设计", "风格化设计", "玻璃拟态", "晶白风格", "霓虹渐变", "手绘插画", "孟菲斯风格"],
        isFavorite: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1
    },
    {
        id: "1722394801012",
        title: '海报设计生成器',
        content: '你是国际顶尖的海报设计艺术总监，请设计高级时尚杂志风格的海报：\n\n## 设计需求\n- **海报主题**：[具体主题，如：APP宣传海报]\n- **核心内容**：[主要宣传文案和关键信息]\n- **目标受众**：[目标用户群体特征]\n\n## 设计风格（请选择一种）\n\n### 极简主义风格 (Minimalist)\n- **设计理念**："少即是多"，大量留白创造呼吸空间\n- **配色方案**：2-3种中性色，白色背景配黑色/深灰文字\n- **排版系统**：精确网格系统和黄金比例，无衬线字体\n- **装饰元素**：极细分隔线和微妙阴影，克制优雅美学\n\n### 大胆现代风格 (Bold Modern)\n- **视觉冲击**：打破传统排版规则，创造强烈视觉冲击\n- **配色方案**：荧光粉、电子蓝、亮黄等鲜艳对比色\n- **排版特点**：不对称动态排版，超大标题（60px+），文字重叠\n- **图形元素**：几何形状，锐利边缘，不规则裁切效果\n\n### 优雅复古风格 (Elegant Vintage)\n- **美学追求**：重现20世纪初期印刷品精致美学\n- **配色方案**：米色/淡黄纸张背景，深棕、暗红老式印刷色\n- **字体选择**：衬线字体如Baskerville，装饰性标题字体\n- **装饰元素**：精致花纹边框、古典分隔线、做旧纸张纹理\n\n## 技术规范\n- **尺寸规格**：宽度400px，高度不超过1280px\n- **技术栈**：HTML5 + Tailwind CSS + Font Awesome + 中文字体\n- **CDN资源**：\n  - Font Awesome: https://lf6-cdn-tos.bytecdntp.com/cdn/expire-100-M/font-awesome/6.0.0/css/all.min.css\n  - Tailwind CSS: https://lf3-cdn-tos.bytecdntp.com/cdn/expire-1-M/tailwindcss/2.2.19/tailwind.min.css\n  - 中文字体: https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;500;600;700&family=Noto+Sans+SC:wght@300;400;500;700&display=swap\n\n## 设计要求\n- **内容层次**：标题、副标题、核心要点、引用区块、编辑笔记\n- **视觉效果**：微妙动效，如淡入效果或悬停反馈\n- **代码质量**：简洁高效，使用CSS变量管理颜色和间距\n- **最终效果**："数字艺术品"级别的视觉质量\n\n请以国际顶尖杂志艺术总监的审美标准，创造令人惊艳的海报设计。',
        category: '设计创意',
        tags: ["海报设计", "平面设计", "风格化设计", "极简主义", "现代风格", "复古风格"],
        isFavorite: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1
    },
    {
        id: "1722394801013",
        title: '视频网页生成器',
        content: '请帮我将指定的YouTube视频内容，转换成一个信息完整、设计现代的HTML动态网页。\n\n## 视频信息\n- **视频链接**: [请在此处粘贴YouTube视频链接]\n- **核心要点**: [如果可能，请简要概括视频的核心内容或主题]\n\n## 设计与技术要求\n\n### 1. 整体风格与布局\n- **视觉风格**: 采用 **Bento Grid** 布局，组织和展示视频的关键信息点。\n- **色彩搭配**: 使用柔和、协调的色彩方案，营造舒适的视觉体验。\n\n### 2. 视觉层次与元素\n- **信息强调**: 使用超大字体或数字来突出视频的核心数据或要点，形成强烈的视觉反差。\n- **图文混排**: 中英文混用时，中文使用大号粗体，英文使用小号字体作为点缀，增强设计感。\n- **图形元素**: 使用简洁的勾线风格图形作为数据可视化或配图，保持页面整洁。\n- **科技感**: 运用高亮色自身的透明度渐变来营造科技感，但避免不同高亮色之间的相互渐变。\n\n### 3. 动效与交互\n- **滚动动效**: 模仿 Apple 官网风格，在用户向下滚动页面时，触发流畅的动画效果。\n- **动效技术**: 使用 **Framer Motion** (通过CDN引入) 来实现所有交互动效。\n\n### 4. 技术栈与资源\n- **基础技术**: 使用 **HTML5**、**TailwindCSS 3.0+** 和必要的 **JavaScript** (均通过CDN引入)。\n- **图表组件**: 如果需要展示数据，可以引用在线的图表组件，但其样式必须与网页整体主题保持一致。\n- **图标库**: 使用专业的图标库，如 **Font Awesome** 或 **Material Icons** (通过CDN引入)，避免使用Emoji。\n\n## 输出要求\n- **单一文件**: 生成一个包含所有HTML、CSS和JavaScript的单一 `.html` 文件。\n- **信息完整**: 确保网页内容没有遗漏视频中的任何关键信息点。\n- **响应式设计**: 页面应能良好地适配桌面和移动设备。\n\n请确保最终交付的网页既是信息丰富的总结，也是一个具有高度视觉吸引力的数字艺术品。',
        category: '设计创意',
        tags: ["网页设计", "Bento Grid", "动效设计", "Framer Motion", "Web开发"],
        isFavorite: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1
    }
]; 