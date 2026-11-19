# Task manager

A small task management system built for a written case. The brief names the task's fields in Portuguese. This glossary fixes the English terms the code, the API and the interface use for them.

## Language

**Task**:
A unit of work a person wants to remember, identified by an id that never changes.
_Avoid_: Todo, item, tarefa

**Title**:
The short required text that names a task. The brief calls it `titulo`.
_Avoid_: Name, titulo

**Description**:
Optional free text with the details of a task. The brief calls it `descricao`.
_Avoid_: Details, notes, descricao

**Creation date**:
The moment the system first stored a task, set once by the server and never edited. The brief calls it `dataCriacao`.
_Avoid_: Timestamp, date, dataCriacao
