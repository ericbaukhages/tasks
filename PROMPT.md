# Baukwood Consulting

## Engineering Take-Home Exercise: Task Management System

### Overview

Baukwood Consulting is looking for engineers who can take an ambiguous problem, make thoughtful technical decisions, and build a working product without unnecessary complexity.

For this exercise, build a small task-management application from scratch.

The application should support basic task management for a single user and provide an **MCP interface** that allows AI agents to interact with the same task system.

The goal is not to build a production-scale project. We are interested in how you think about the problem, how you structure the application, and how you make reasonable decisions when the requirements are intentionally incomplete.

---

## Core Requirements

### 1. Task Management

The application must support basic task management.

At minimum, a user should be able to:

* Create a task
* View a list of tasks
* View an individual task
* Mark a task as complete
* Delete a task

A task should have, at minimum:

* An identifier
* A description
* A status
* A creation timestamp
* A completion timestamp, when applicable

You may introduce additional fields if you believe they are useful, but avoid adding complexity without a clear reason.

---

### 2. Web Interface

Provide a simple web interface for interacting with the task system.

The interface should make the basic task workflow straightforward:

* See outstanding tasks
* Create a task
* Complete a task
* Delete a task
* View completed tasks

The visual design is not the primary focus of this exercise. We are more interested in usability and implementation quality than visual polish.

---

### 3. MCP Interface

The task system must expose an **MCP server** so that an MCP-compatible client can interact with the application.

The MCP interface should provide tools corresponding to the application's core capabilities.

At minimum, an agent should be able to:

* Create a task
* List tasks
* Complete a task
* Delete a task

The MCP interface should return useful, structured information that an agent can understand and act upon.

The application should be testable with the **MCP Inspector** during development.

The MCP server should not implement task-management logic independently of the rest of the application. MCP should be treated as another interface to the application's underlying task-management functionality.

---

## Technical Constraints

Use the following technologies:

* **TypeScript**
* **Node.js**
* **Fastify**
* **SQLite**
* **React**
* **Vite**
* **Model Context Protocol TypeScript SDK**

You may use supporting libraries where appropriate.

However, do not introduce additional frameworks or infrastructure simply because they are popular or convenient. Prefer a small number of well-understood dependencies.

In particular:

* An ORM is not required.
* A cloud database is not required.
* Cloud deployment is not required.
* Authentication is not required.
* The application only needs to support a single user.
* The application only needs to run locally.

The application should be runnable on a developer's machine with reasonable setup instructions.

---

## Architecture

The application should have a clear separation between:

1. **Domain logic**
2. **Application/business logic**
3. **Persistence**
4. **HTTP interface**
5. **MCP interface**
6. **Web interface**

The HTTP and MCP interfaces should ultimately operate on the same application functionality.

For example:

```text
                    Web UI
                       │
                       ▼
                  HTTP API
                       │
                       ▼
               Application Core
                  │         │
                  │         │
                  ▼         ▼
               Domain    Persistence
                            │
                            ▼
                          SQLite
                            
                  ▲
                  │
             MCP Server
```

The MCP server should not directly manipulate the database when an appropriate application-level operation exists.

Similarly, the web application should not contain business rules that belong in the application layer.

---

## Agent Interaction

One of the primary goals of the exercise is to explore what a task-management system looks like when both humans and AI agents are clients.

Consider the difference between exposing low-level database operations and exposing meaningful actions.

For example, an MCP server might expose:

```text
create_task
list_tasks
complete_task
delete_task
```

rather than exposing generic database operations such as:

```text
insert_row
update_row
delete_row
query_database
```

The interface should be designed for an agent that needs to accomplish useful work, rather than for an agent that needs to understand the application's internal implementation.

You may introduce additional MCP tools if they provide meaningful functionality.

---

## Development Approach

Build the application without AI-generated implementation code.

You may use documentation, specifications, debugging tools, and other normal developer resources.

The purpose of this exercise is to demonstrate your own understanding of:

* TypeScript
* HTTP applications
* databases
* application architecture
* MCP
* frontend development
* debugging
* technical decision-making

You should be able to explain the implementation and architectural decisions you made.

---

## What We Are Looking For

We are less interested in the number of features you implement than in the quality of your decisions.

In particular, consider:

### Simplicity

Does the implementation solve the problem without unnecessary abstraction?

### Architecture

Are responsibilities clearly separated?

Can the application be changed without requiring changes throughout the entire codebase?

### API Design

Are the HTTP and MCP interfaces intuitive and consistent?

### MCP Design

Does the MCP interface expose useful capabilities to an AI agent?

Are tool names, descriptions, inputs, and outputs understandable to an agent?

### Data Modeling

Is the data model appropriate for the current requirements?

Does it leave reasonable room for future development without prematurely designing the entire system?

### User Experience

Can someone quickly understand how to create and manage tasks?

### Code Quality

Is the code readable, maintainable, and appropriately typed?

### Technical Judgment

Most importantly:

**Can you explain why you made the decisions you made?**

We do not expect every candidate to make the same decisions.

---

# Deliverables

Provide:

1. The complete source code
2. A README containing setup and usage instructions
3. Instructions for running the web application
4. Instructions for running the MCP server
5. Instructions for connecting the MCP server to an MCP client
6. A brief architectural overview
7. A short explanation of significant technical decisions

The README should include an example of interacting with the MCP server.

For example:

```text
User: Add "Replace the bathroom faucet" to my task list.

Agent: ...
```

Show the corresponding MCP interaction and resulting task.

---

# Bonus Considerations

These are intentionally optional.

If you have time, consider how the system might eventually support:

* Task priorities
* Due dates
* Projects or lists
* Tags
* Recurring tasks
* Task dependencies
* Natural-language task capture
* Searching and filtering
* Agent-driven task planning
* Multiple MCP clients
* A command-line interface
* Import/export
* Integration with existing task-management systems

You do **not** need to implement these features.

Instead, if you choose not to implement them, you may briefly describe how you would approach them and what changes they might require to the current architecture.

---

# Final Question

Imagine that six months from now, Baukwood decides that this task application should become the foundation for a broader personal productivity system used by both humans and AI agents.

**What would you keep, what would you change, and what would you deliberately leave alone?**

We are interested in your reasoning as much as your implementation.

---

## Timebox

Please treat this as a small project rather than a production application.

A reasonable implementation should be achievable in a few focused sessions.

Do not spend time solving problems that the requirements do not currently present.

**Make reasonable decisions, document them, and ship.**
