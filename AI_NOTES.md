## AI usage

This project uses Claude Code as a coding assistant. See the **AI Usage Notes** section in [INDEPENDENT_DESIGN.md](INDEPENDENT_DESIGN.md) for the running log of each utilization/change.


**Which parts of the system did Claude write end-to-end?**  
I used Claude to generate most of the feature code after my initial design and decision making. Before using the tool to create the output, I worked on an independent designing of the system with the technologies, features, and core functionality that I required before getting external input. There were a number of prompts used to change the implementation or clarify my design to assist with Claude's understanding of my requirements.

Each feature created by the tool was manually tested and Claude also generated, initiated, and tore-down numerous scripted tests to validate the output of namely the backend API endpoints and docker functionality.

**Where did you have to push back on, fix, or rewrite Claude’s output? Give one concrete example.**  
For the majority of the prompts provided to the tool, my local design document and answers to clarifying questions helped reduce the number of push backs, fixes, and rewrites needed on my part after Claude generated its outputs. I still, however, had to change many implementation details from Claude's output. Rather than utilizing hard-coded mock data for vertical testing as Claude initially recommended, I prompted the tool to script 3 pet entities for the API to leverage and have them actually persisting within the SQLite database to better emulate the API-database flow.


**One thing Claude did better than you expected, and one thing it did worse.**  
Claude did much better than I expected at resolving issues that it found itself in the middle of a feature implementation. During the utilization of the external APIs to populate the database with the 100 entities, Claude recognized that the schema returned by the API both had reversed breed naming and did not initially provide the name of the breed with the image. Claude resolved the naming issue and integrated another API call to resolve the missing data before I was required to interact with the results.

One thing that Claude did worse than I was expecting was the validation of the code. In previous iterations, I have used Claude and it has generated some saved, automated testing code for me to return to and run for iterative additions. While it does a good job of creating and running its own code to test features as they arrive, it does not always test all of the previous code or features when committing. My manual smoke testing helped with closing this gap, but explicitly having Claude generate unit and integration testing would help with my assurance that features remain working following the addition of new work.

**If you used other AI tools alongside Claude, what role did each play?**  
I did not use additional tools alongside Claude (Opus 4.7)
