# Claude Code Configuration - Production Civilization Game

## 🚨 CRITICAL: CONCURRENT EXECUTION & FILE MANAGEMENT

**ABSOLUTE RULES**:
1. ALL operations MUST be concurrent/parallel in a single message
2. **NEVER save working files, text/mds and tests to the root folder**
3. ALWAYS organize files in appropriate subdirectories
4. **USE CLAUDE CODE'S TASK TOOL** for spawning agents concurrently, not just MCP

### ⚡ GOLDEN RULE: "1 MESSAGE = ALL RELATED OPERATIONS"

**MANDATORY PATTERNS:**
- **TodoWrite**: ALWAYS batch ALL todos in ONE call (5-10+ todos minimum)
- **Task tool (Claude Code)**: ALWAYS spawn ALL agents in ONE message with full instructions
- **File operations**: ALWAYS batch ALL reads/writes/edits in ONE message
- **Bash commands**: ALWAYS batch ALL terminal operations in ONE message
- **Memory operations**: ALWAYS batch ALL memory store/retrieve in ONE message

---

## 📋 Project Profile

### **Architecture & Maturity**
- **Type**: Production-ready multiplayer strategy game (Civilization-style)
- **Architecture**: TypeScript monorepo with NPM workspaces (@civ-game/*)
- **Maturity**: **Production Ready** - Zero TS errors, 99.6% test success rate
- **Performance**: <100ms map generation, <10ms action processing, 100+ concurrent games

### **Technology Stack**
```yaml
Frontend: React 18 + TypeScript 5 + Vite + Material-UI + Redux Toolkit
Backend: Node.js + Express + Socket.io + PostgreSQL + Redis + JWT
Shared: TypeScript 5 + Zod validation + cross-package type definitions
Testing: Jest (server) + Vitest (client) + 579/579 tests passing
Security: bcryptjs, Helmet, CORS, rate limiting, Zod validation
Deployment: Docker + GitHub Actions + GitHub Pages + production-ready containers
```

### **Key Features Implemented**
- ✅ **Real-time Multiplayer**: WebSocket-based synchronized gameplay with spectator mode
- ✅ **Sophisticated AI**: 5 AI personalities with 4 difficulty levels
- ✅ **Complete Game Engine**: Hex-grid procedural generation, combat, diplomacy, technology trees
- ✅ **Mobile Support**: Touch controls, responsive design, pinch-to-zoom navigation
- ✅ **Save/Load System**: Game persistence with auto-save and manual save management
- ✅ **Security**: JWT authentication with key rotation, comprehensive input validation

### **Directory Structure**
```
civ-game/
├── client/         # React frontend (Vite + TypeScript + Material-UI)
├── server/         # Node.js backend (Express + Socket.io + PostgreSQL)
├── shared/         # Common types, utilities, validation schemas (Zod)
├── docs/           # Comprehensive documentation (32 files) - ALWAYS UPDATE
├── scripts/        # Development and automation utilities
├── .github/        # CI/CD workflows and deployment automation
└── [config files]  # Docker, TypeScript, linting, workspace configuration
```

**NEVER save files to root except essential config. Use appropriate subdirectories.**

---

## 🔧 Development Rules

### **Branching Strategy**
- **Main Branch**: `main` (protected, production-ready)
- **Feature Branches**: `feature/description` or `feature/issue-number`
- **Hotfix Branches**: `hotfix/critical-issue`
- **Pull Requests**: Required for all changes to main

### **Commit Style**
```
feat(client): add spectator mode with read-only overlay
fix(server): resolve WebSocket reconnection timeout issue
docs(api): update authentication security documentation
test(shared): add comprehensive validation schema tests
```

### **Code Quality Standards**
- **TypeScript**: Strict mode enabled, zero TS errors required
- **Testing**: 99%+ success rate (current: 579/579 tests passing)
- **Linting**: ESLint with TypeScript rules, automatic formatting
- **Security**: No hardcoded secrets, proper input validation, security headers

### **Performance Requirements**
- **Map Generation**: <100ms for 20x20 hex grids
- **Action Processing**: <10ms with full validation
- **WebSocket Latency**: <200ms end-to-end updates
- **Bundle Size**: <600kB total, <200kB gzipped

### **Definition of Done**
1. ✅ Feature implemented with TypeScript types
2. ✅ Comprehensive tests written and passing (>99% success)
3. ✅ Security validation completed (input sanitization, authentication)
4. ✅ Documentation updated (API specs, user guides, technical docs)
5. ✅ Mobile responsive design validated
6. ✅ Performance benchmarks met
7. ✅ Code review approved
8. ✅ CI/CD pipeline green

---

## 🛡️ Quality Gates

### **Automated CI Checks** (GitHub Actions)
```yaml
Build Pipeline:
  - NPM workspace dependency installation
  - TypeScript compilation (zero errors required)
  - Multi-package builds (shared → server → client)
  - ESLint compliance across all packages
  - Unit and integration test execution
  - Security validation and dependency audit
```

### **Test Coverage Targets**
- **Server**: 80%+ coverage (currently 99.6% success: 247/248 tests)
- **Client**: 70%+ coverage (currently 100% success: 67/67 tests)  
- **Shared**: 75%+ coverage (validation schemas and utilities)
- **Integration**: End-to-end multiplayer scenarios

### **Security Gates**
- **Authentication**: JWT with 15min access + 7day refresh tokens
- **Rate Limiting**: 5 auth attempts/5min, 100 API calls/15min
- **Input Validation**: Zod schemas for all API endpoints
- **Security Headers**: Helmet.js with CSP, CORS configuration
- **Secrets Management**: Environment variables, no hardcoded credentials

### **Performance Benchmarks**
- **Bundle Analysis**: Rollup visualizer, tree-shaking optimization
- **WebSocket Performance**: Connection handling for 100+ concurrent games
- **Database Performance**: Query optimization, connection pooling
- **Memory Management**: Game cleanup, resource management

### **Release Criteria**
1. All CI checks passing (build, test, lint, security)
2. Security validation complete (JWT, CORS, input validation)
3. Performance benchmarks met (<100ms map, <10ms actions)
4. Documentation updated (API specs, deployment guides, user docs)
5. Mobile responsive validation passed
6. Production deployment tested (Docker containers, health checks)

---

## 🔄 Workflow

### **Task Management** (`todo.md`)
- **High Priority**: Game-breaking bugs, security issues, core feature gaps
- **Medium Priority**: Feature enhancements, performance optimizations
- **Low Priority**: Documentation improvements, code refactoring
- **Process**: todo.md → feature branch → implementation → testing → review → merge

### **Documentation Update Policy** (AUTOMATIC)
- **Project Index**: Auto-maintained with 100% coverage (32 files tracked)
- **API Documentation**: OpenAPI specs updated with code changes
- **User Guides**: Updated when UI/UX changes affect user workflows
- **Technical Docs**: Architecture and deployment guides kept current
- **Automation**: `npm run docs:update` maintains PROJECT_INDEX.md automatically

### **Release Flow**
1. **Development**: Feature branches with comprehensive testing
2. **Integration**: Main branch deployment with CI/CD validation
3. **Staging**: Docker container deployment with production-like environment
4. **Production**: GitHub Pages (frontend) + containerized backend deployment
5. **Monitoring**: Health checks, performance metrics, error tracking

### **Game Development Patterns**
- **Feature Development**: Core game logic → UI implementation → mobile optimization → testing
- **Multiplayer Features**: Server-side validation → WebSocket events → client synchronization → spectator support
- **AI Development**: Decision algorithms → personality tuning → difficulty scaling → performance optimization

---

## 🧠 Knowledge Sources & MCP Servers

### **Context7 MCP** - Framework Documentation
**Use for**: Official framework patterns and best practices
- **React 18**: Hooks, concurrent features, performance optimization
- **TypeScript 5**: Advanced types, monorepo configuration, strict mode
- **Node.js + Express**: API development, middleware, security patterns
- **Socket.io**: Real-time multiplayer, connection management, scaling
- **Material-UI**: Component library, theming, responsive design

### **Magic MCP** - UI Component Generation  
**Use for**: Game-specific UI components and mobile interfaces
- **Game HUD**: Resource displays, action buttons, turn indicators
- **Map Interface**: Hex grid visualization, unit overlays, terrain rendering
- **Mobile Controls**: Touch gestures, responsive layouts, accessibility
- **Modal Systems**: Technology trees, diplomacy panels, game settings

### **Serena MCP** - Large Codebase Navigation
**Use for**: Navigating the 100+ file monorepo structure
- **Symbol Operations**: Function/class renames across packages
- **Project Memory**: Session persistence, development context
- **Cross-Package References**: Client-server-shared dependencies
- **Code Exploration**: Large file analysis, architectural understanding

### **Morphllm MCP** - Bulk Code Transformations
**Use for**: Framework updates and code modernization
- **Framework Migrations**: React updates, TypeScript upgrades
- **Code Style Enforcement**: ESLint rule applications, formatting consistency
- **Refactoring**: Component modernization, performance optimizations

### **Playwright MCP** - Game Flow Testing
**Use for**: End-to-end testing and validation
- **Multiplayer Scenarios**: Game joining, turn-based gameplay, spectator mode
- **Mobile Testing**: Touch interactions, responsive behavior validation
- **Accessibility**: WCAG compliance, keyboard navigation, screen readers

### **Sequential MCP** - Complex Game Logic
**Use for**: Multi-step game feature development
- **AI Development**: Decision algorithms, personality systems, difficulty tuning
- **Game Engine**: Combat resolution, diplomacy mechanics, victory conditions
- **Performance Analysis**: Bottleneck identification, optimization strategies

---

## 🚀 Available Agents (54 Total)

### **Game Development Agents**
`game-engine-dev`, `ui-game-designer`, `multiplayer-architect`, `mobile-game-dev`, `game-ai-dev`

### **Core Development**
`coder`, `reviewer`, `tester`, `planner`, `researcher`

### **Frontend Specialists**
`frontend-architect`, `ui-ux-designer`, `mobile-dev`

### **Backend Specialists** 
`backend-architect`, `backend-dev`, `api-docs`, `database-architect`

### **Quality & Security**
`security-engineer`, `quality-engineer`, `production-validator`, `tdd-london-swarm`

### **Architecture & Performance**
`system-architect`, `performance-engineer`, `perf-analyzer`, `performance-benchmarker`

### **Documentation & Analysis**
`technical-writer`, `code-analyzer`, `requirements-analyst`

### **DevOps & Deployment**
`devops-architect`, `cicd-engineer`

---

## 🎯 Claude Code vs MCP Tools

### **Claude Code Handles ALL EXECUTION**:
- **Task tool**: Spawn and run agents concurrently for actual work
- File operations (Read, Write, Edit, MultiEdit, Glob, Grep)
- Code generation and programming
- Bash commands and system operations
- Implementation work
- Project navigation and analysis
- TodoWrite and task management
- Git operations and deployment

### **MCP Tools ONLY COORDINATE**:
- Swarm initialization (topology setup)
- Agent type definitions (coordination patterns)  
- Task orchestration (high-level planning)
- Memory management and session persistence
- Performance tracking and metrics
- GitHub integration and automation

**KEY**: MCP coordinates the strategy, Claude Code's Task tool executes with real agents.

---

## 🎮 Game-Specific Development Patterns

### **Feature Development Workflow**
```javascript
// Optimal agent combination for game features
[Single Message - Game Feature Development]:
  Task("Game Engine Developer", "Implement core game mechanics with validation", "backend-dev")
  Task("UI Game Designer", "Create responsive game interface with touch support", "ui-ux-designer") 
  Task("Mobile Developer", "Optimize for touch interactions and gestures", "mobile-dev")
  Task("Multiplayer Architect", "Add WebSocket synchronization and spectator mode", "backend-architect")
  Task("Quality Engineer", "Create comprehensive game flow tests", "tester")
  Task("Performance Engineer", "Optimize for 100+ concurrent games", "performance-engineer")
```

### **Bug Fixing for Production Issues**
```javascript
// Production issue resolution pattern
[Single Message - Critical Bug Fix]:
  Task("Root Cause Analyst", "Identify core issue with logs and metrics", "code-analyzer")
  Task("Security Engineer", "Verify no security implications", "security-engineer")
  Task("Game Engine Developer", "Implement fix with comprehensive validation", "backend-dev")
  Task("Quality Engineer", "Create regression tests and validation", "tester")
  Task("Production Validator", "Validate fix in production-like environment", "production-validator")
```

### **Performance Optimization**
```javascript
// Game performance optimization workflow  
[Single Message - Performance Enhancement]:
  Task("Performance Engineer", "Profile and identify bottlenecks", "performance-benchmarker")
  Task("Database Architect", "Optimize database queries and connections", "backend-architect")
  Task("Frontend Architect", "Optimize React rendering and bundle size", "frontend-architect")
  Task("Game Engine Developer", "Optimize game logic and AI algorithms", "backend-dev")
```

---

## 📊 Production Metrics & Achievements

### **Current Status**: ✅ **PRODUCTION READY**
- **Test Success Rate**: 579/579 tests passing (100% success)
- **TypeScript Errors**: 0 (migrated from 162+ errors)
- **Bundle Size**: 508kB total (157kB gzipped, 35KB CSS)
- **Security Score**: 96/100 (comprehensive protection)
- **Performance**: <100ms map generation, <10ms action processing
- **Documentation Coverage**: 100% (32/32 files tracked)

### **Architecture Excellence**
- **Monorepo Design**: Clean separation with shared type definitions
- **Real-time Architecture**: WebSocket handling for 100+ concurrent games
- **Security Implementation**: JWT rotation, comprehensive validation, rate limiting  
- **Mobile-First Design**: Touch-optimized with 90%+ mobile usability score
- **AI System**: 5 personalities with sophisticated decision-making algorithms

---

## 🔗 SPARC & Claude-Flow Integration

### **SPARC Methodology** (Preserved from original)
1. **Specification** - Requirements analysis (`sparc run spec-pseudocode`)
2. **Pseudocode** - Algorithm design (`sparc run spec-pseudocode`) 
3. **Architecture** - System design (`sparc run architect`)
4. **Refinement** - TDD implementation (`sparc tdd`)
5. **Completion** - Integration (`sparc run integration`)

### **Core Commands**
- `npx claude-flow sparc modes` - List available modes
- `npx claude-flow sparc run <mode> "<task>"` - Execute specific mode
- `npx claude-flow sparc tdd "<feature>"` - Run complete TDD workflow
- `npm run build` - Build all packages
- `npm run test` - Run comprehensive test suite
- `npm run docs:update` - Update PROJECT_INDEX.md automatically

### **Performance Benefits**
- **84.8% SWE-Bench solve rate**
- **32.3% token reduction**  
- **2.8-4.4x speed improvement**
- **27+ neural models available**

---

## 🏛️ Project Governance

### **Missing Governance Files** (Recommended)
- `CODEOWNERS` - Assign code review ownership by package/domain
- `CONTRIBUTING.md` - Contributor guidelines and development process
- `.env.example` - Environment variable templates for development
- `SECURITY.md` - Security policy and vulnerability reporting
- `.editorconfig` - Consistent editor settings across the team

### **CI/CD Enhancements** (Recommended)
- **Test Matrix**: Multiple Node.js versions (16.x, 18.x, 20.x)
- **Dependency Auditing**: `npm audit` and Snyk vulnerability scanning
- **SBOM Generation**: Software Bill of Materials for security compliance
- **Performance Monitoring**: Bundle size tracking and performance regression detection
- **Security Scanning**: CodeQL analysis and secret detection

### **Quality Improvements** (Recommended)
- **Code Coverage Reports**: Automated coverage reporting with trend analysis
- **Performance Benchmarks**: Automated performance regression testing
- **Documentation Validation**: Automated link checking and documentation quality metrics
- **Mobile Testing**: Automated testing on mobile devices and screen sizes

---

## 🚀 Quick Setup

```bash
# Clone and setup monorepo
git clone <repo-url> && cd civ-game
npm install                    # Install all workspace dependencies

# Development environment
npm run dev                    # Start all packages in development mode

# Testing and validation
npm run test                   # Run all tests (579 tests)
npm run lint                   # ESLint validation 
npm run typecheck             # TypeScript compilation check
npm run build                 # Production build

# Documentation management
npm run docs:scan             # Scan documentation files
npm run docs:update           # Update PROJECT_INDEX.md automatically
npm run docs:validate         # Validate documentation quality

# Add Claude Flow MCP server
claude mcp add claude-flow npx claude-flow@alpha mcp start
```

---

## 📞 Support & Resources

### **Documentation**
- **Project Index**: `/docs/PROJECT_INDEX.md` - Central navigation hub
- **API Documentation**: `/docs/api/CIVILIZATION_GAME_API.yaml` - Complete OpenAPI spec
- **User Guide**: `/docs/user/USER_GUIDE.md` - Gameplay instructions
- **Developer Guide**: `/docs/setup/DEVELOPER_GUIDE.md` - Development setup

### **External Resources**
- **Claude-Flow**: https://github.com/ruvnet/claude-flow
- **Issues**: https://github.com/ruvnet/claude-flow/issues

---

Remember: **Claude Flow coordinates, Claude Code creates!**

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.
Never save working files, text/mds and tests to the root folder.