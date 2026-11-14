# Kaveri

Kaveri is a butler that sits in a family's group chat, notices a life event or an official letter, and comes back with a sourced plan. These are the words this repository's docs and code use for it.

## Language

### Hackathon

**Main challenge**:
A sponsor's problem statement that a submission is primarily entered into. A submission has exactly one.
_Avoid_: Track (a track is a group of main challenges), challenge (when the kind matters)

**Tech challenge**:
A sponsor's "best use of our technology" prize that a submission can enter in addition to its main challenge. A submission can have several.
_Avoid_: Add-on, side challenge, sidequest

**Submission**:
One entry on the Junction Platform: a name, a description, a pitch video, one main challenge and any number of tech challenges.
_Avoid_: Project (the platform's word), entry

### The product

**Family**:
The group of people who share one chat with Kaveri and whose cases it keeps.
_Avoid_: User, household (a household is the facts about a family, such as children and income), customer

**Trigger**:
A message that makes Kaveri act: a stated life event or tedious task, a shared official document, a message addressed to it, or a reminder falling due.
_Avoid_: Prompt, query, command, request

**Silence rule**:
Kaveri says nothing in the chat unless there is a trigger.
_Avoid_: Ambient mode (one way of applying the rule), quiet mode

**Case**:
One life event or task Kaveri has taken up for a family, from the trigger until the family is done with it.
_Avoid_: Errand, task, ticket, request, conversation

**Plan**:
The short list of what to do, by when, and what the family is entitled to, posted in the chat for a case. Every plan line carries a numbered source.
_Avoid_: Proposal, answer, summary, result

**Case file**:
The page for one case: timeline, money, the quoted sentence behind every claim, drafts, and what could not be confirmed.
_Avoid_: Report, dossier, case page (the screen that shows a case file)

**Verified quote**:
A sentence that was found on the cited page when that page was opened again. A claim without one never reaches a plan.
_Avoid_: Citation, source (a source is the page; the quote is the sentence), grounded claim

**Approval**:
A family member's one-tap yes to a next step, such as drafting a letter or setting reminders. Kaveri never sends, files, books or pays.
_Avoid_: Confirmation, sign-off

### The parts

**Engine**:
The part that researches a case and verifies its quotes. It is the same for every way of reaching Kaveri.
_Avoid_: Backend, agent, research agent

**Bot runtime**:
The part that sits in the chat: it applies the silence rule, hands a trigger to the engine, posts the plan and offers approvals.
_Avoid_: Backend, agent, bot (the bot is what the family sees; the runtime is what runs it)

**Operator**:
The person whose machine runs the bot runtime for a demo. There is one at a time, because one Telegram token allows one running bot.
_Avoid_: Owner (the owner builds a part; the operator runs it), host
