\# Work Item Facts



Facts are observations, data points, and contextual information specific to this Work Item. They inform design and implementation decisions but are not prescriptive.



\*\*Format:\*\*



```

\### YYYY-MM-DD: \[Label/Title]

\*\*Scope:\*\* work-item

\*\*Captured:\*\* YYYY-MM-DD

\*\*Source:\*\* \[Optional: user name, URL, chat thread, etc.]

\*\*Status:\*\* \[active | promoted-to-expert | archived]

\[Content with full formatting preserved]

\##

```



\##



\*\*Note:\*\* Work Item-level facts do NOT need `\*\*Workflows:\*\*` field - they inherit the Work Item's workflow context.



For Expert Role-level facts (in `facts/facts.md`), the format includes workflow applicability:



```

\## YYYY-MM-DD: \[Label/Title]

\*\*Scope:\*\* expert-role

\*\*Workflows:\*\* all | developer | production-incident | \[comma-separated list]

\*\*Captured:\*\* YYYY-MM-DD

\*\*Source:\*\* \[Optional]

\[Content]

\##

```



\##



\[Facts will be added here as they are captured during Work Item execution]



