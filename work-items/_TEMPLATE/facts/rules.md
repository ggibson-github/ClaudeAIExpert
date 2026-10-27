\# Work Item Rules



Rules are constraints, procedures, and patterns that MUST be followed during this Work Item. They are prescriptive and violations should be logged in the journal.



\*\*Format:\*\*

```

\## YYYY-MM-DD: \[Label/Title]

\*\*Scope:\*\* work-item

\*\*Captured:\*\* YYYY-MM-DD

\*\*Source:\*\* \[Optional: user name, URL, chat thread, etc.]

\*\*Status:\*\* \[active | promoted-to-expert | archived]



\[Content with full formatting preserved]

\##

\---

```

\##

\*\*Note:\*\* Work Item-level rules do NOT need `\*\*Workflows:\*\*` field - they inherit the Work Item's workflow context.



For Expert Role-level rules (in `facts/rules.md`), the format includes workflow applicability:

```

\## YYYY-MM-DD: \[Label/Title]

\*\*Scope:\*\* expert-role

\*\*Workflows:\*\* all | developer | \[comma-separated list]

\*\*Captured:\*\* YYYY-MM-DD

\*\*Source:\*\* \[Optional]

\*\*Rule:\*\* \[statement]

\*\*Why:\*\* \[reason]

\*\*How to apply:\*\* \[steps]

\*\*Violation:\*\* \[consequence]

\##

\---

```

\##

\---

\##

\[Rules will be added here as they are captured during Work Item execution]



