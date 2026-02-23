### 对齐benchmark运行数据格式

一个scenariow我这边会用到的数据

```txt
task_x
├── scenario_x
│   ├── sessions
│   │   ├── main_session_xxx.jsonl      (openclaw style)
│   │   ├── other_session_xxx.jsonl
│   │   ├── maybe_a_session_for_individual_channel.jsonl
│   │   └── sessions.json   (infomation for current session and agent)
│   ├── tests (folder for question & answer)
│   │   └── <···>
│   ├── workspace
│   │   ├── AGENTS.md       (default)
│   │   ├── HEARTBEAT.md    (default)
│   │   ├── IDENTITY.md     (default)
│   │   ├── SOUL.md         (default)
│   │   ├── TOOLS.md        (default)
│   │   ├── USER.md         (task-specified)
│   │   ├── <other-material-folder>
│   │   │   ├── <maybe-a-project-folder>
│   │   │   ├── <maybe-some-docs>
│   │   │   └── <···>
│   │   └── <···>
│   └── <other-file>
├── scenario_y
└── <···>
```

我需要你们添加（所有涉及到agent做读写的文件**不要重命名**）
- **main_session.jsonl**：作为benchmark的入口，包含测评中所有要用到的上下文信息，具体可参考[example_section](task5/example_section.jsonl)
- **其他相关session**：例如不同channel分了不同session就也一并传过来（复制整个session文件夹就会都带上）
- **sessions.json**：直接复制自`/home/user_name/.openclaw/agents/main/sessions/sessions.json`默认路径
- **workspace的`USER.md`**：即用户画像（其他`*.md`我会统一用默认的，不用你们弄，但一般会一并复制上来也无妨），直接复制`/home/user_name/.openclaw/workspace`默认路径
- **workspace的其他相关文件**：例如task1代码仓库历史问答，就把代码库放这里；task2项目开发事件图摘要，就把相关项目材料放这里；总之agent读写涉及的文件都要放上来
- **QA文件夹**：benchmark的测试问题，也包含答案或评估方法，例如[eval_flow](task1/scenario_1/eval_flow.json)，如果有其他相关文件也放进来
- **其他你们认为有用的文件**：也许我跑bench不一定用得上，但万一哪天要用，可以传你们当前做的这些结构化文件，或者造数据过程中的中间文件，就是杂七杂八但又感觉有点用的，都传上来做备份

如何获取上述文件，具体就是真的拿openclaw跑一遍

不怕上传多了，就怕少了回头反复补，全传上来，之后哪里差了我手动fix一下也好
