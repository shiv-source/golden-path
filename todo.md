
You are a senior GitHub Platform Engineer. Design and implement an internal "Repository Configuration Onboarding System" or suggest other features that can be added into this golden-path repo for a GitHub Organization.

Goal:
Create a system where developers can request repository onboarding by creating a GitHub Issue. The issue collects repository details and configuration requirements. A GitHub Action validates the request, updates a central org-config repository, and creates pull requests to apply standardized configuration files to the target repository.

Architecture requirements:

1. Central configuration repository

Create an org-config repository that acts as the source of truth.

Structure:

org-config/
├── profiles/
│   ├── common/
│   │   ├── .editorconfig
│   │   ├── dependabot.yml
│   │   ├── CODEOWNERS
│   │   ├── SECURITY.md
│   │   └── .github/
│   │       └── ISSUE_TEMPLATE/
│   │
│   ├── node/
│   │   ├── .prettierrc
│   │   ├── eslint.config.js
│   │   ├── commitlint.config.js
│   │   └── github/
│   │       └── workflows/
│   │
│   ├── python/
│   │   ├── pyproject.toml
│   │   └── ruff.toml
│   │
│   └── java/
│       └── checkstyle.xml
│
├── repositories/
│   └── <repo-name>.yaml
│
└── .github/
    └── workflows/


2. Repository registration model

Each repository should have a declarative configuration file.

Example:

repositories/my-api.yaml

```yaml
repository: my-api

profiles:
  - common
  - node-service

options:
  codeql: true
  gitleaks: true
  dependabot: true
````

Profiles define which files/configurations are applied.

Avoid copying individual configuration choices everywhere.

Use profiles such as:

* common
* node-library
* node-service
* python-service
* java-service

3. GitHub Issue Form

Create an issue form:

.github/ISSUE_TEMPLATE/repository-onboarding.yml

Fields:

* Repository name

* Repository type:

  * service
  * library
  * frontend
  * CLI
  * documentation

* Programming language:

  * Node.js
  * Python
  * Java
  * Go

* Optional features:

  * CodeQL
  * Gitleaks
  * Dependabot
  * Release automation

The issue should be easy for developers to complete.

4. GitHub Action: onboarding workflow

Create:

.github/workflows/repository-onboarding.yml

The workflow should:

Trigger:

* issue opened
* issue labeled "approved"

Steps:

1. Parse issue form values.

2. Validate repository:

   * Check repository exists in the GitHub organization.
   * Fail with a clear message if it does not exist.

3. Generate repositories/<repo-name>.yaml.

4. Determine profiles automatically.

Example:

Input:

language=node
type=service

Produces:

profiles:

* common
* node-service

5. Create a branch:

feature/onboard-<repo-name>

6. Commit generated configuration.

7. Open a PR against org-config.

8. Apply configuration workflow

Create another workflow:

.github/workflows/apply-repository-config.yml

Trigger:

* repository config file changed
* manual dispatch

Steps:

1. Read repositories/<repo-name>.yaml.

2. Clone target repository.

3. Merge profiles:

Example:

common + node-service

4. Copy files into target repository.

5. Create a PR:

Title:
"Apply organization standard configuration"

Do not push directly to repositories.

6. Technology choices

Use:

* GitHub Actions
* GitHub CLI where useful
* Node.js or Python scripts for automation
* YAML configuration
* GitHub REST API

7. Design requirements

The implementation must:

* Be idempotent.
* Never overwrite custom files silently.
* Detect conflicts.
* Produce clear PR descriptions.
* Support adding new profiles later.
* Support adding new languages later.
* Keep repository onboarding reproducible.

8. Deliverables

Generate:

1. Complete repository structure.
2. GitHub issue form YAML.
3. GitHub Actions workflows.
4. Scripts required by workflows.
5. Example profiles.
6. Example repository configuration.
7. README explaining:

   * How developers request onboarding.
   * How profiles work.
   * How administrators add new standards.
   * How updates are rolled out.

Before writing code:

* Explain the architecture.
* Identify potential problems.
* Suggest improvements.
* Then implement.

