*For this library, the following would be true:*

Consider you have this `Group` setup:
```js
const group = new Group
group.append("A", "B", "C")
```
Then the diagram would be:
```js
Group
 ├─ A
 ├─ B
 └─ C

document
└─ body // No children.
```

Adding a group to a parent (that is attached to `document`, it is required due to `connectedCallback` reliance) would look like that:
```js
const parent = document.createElement("div")
parent.append(group)

// document.body.append(parent) // The order doesn't matter, though for group to appear in the `parent`, must be attached to a `document` in some way.
```
This diagram would represent it:
```js
Group
 ├─ A
 ├─ B
 └─ C

document
└─ body
   ├─ A
   ├─ B
   └─ C
```

Let's break down this diagram in terms of properties (interfaces):

- Accessing any properties of `group` will (*should*) be 100% same as `DocumentFragment` in the moment it is not yet connected anywhere (which flushes its children), expect those that are `null` by design like `nextSibling` or `parent`.
- `childNodes` of `group` are both in `group` and `document.body`
```js
group.childNodes // ["A", "B", "C"]
document.body.childNodes // ["A", "B", "C"]
```
- `parent` return the parent where `group` was previously attached to - the same with other properties.

In short, `group` behaves just like a normal `ParentNode`.

---

That was a simple part, let's see what probably confuses people:

- `group` node itself can't be find in the `document`, even if attached and `parent` property shows it is. :exploding_head: 
- `group` node doesn't have a wrapper and is completely transparent to CSS selectors, Box View Model and Layout.

In short, `group` is a virtual node, but faking to be real `ParentNode`.
Another interpretation would be "a `NodeList` with `ParentNode` and `ChildNode` interfaces".

---

Unaffected `group` children for special elements like `table`, `select`:
In contradiction to other parent elements, `group` will never mess up with its children, they are attached as given, you will never face a situation where elements are forcefully formatted in `group` node when it's being attached since `group` is a limbo.

---

Adding `group` in between other elements:

```js
group.append(A, B, C)
document.body.append(X, Y, Z)
```
:arrow_down: 
```js
Group
├─ A
├─ B
└─ C

(document)
└─ body
   ├─ X
   ├─ Y
   └─ Z
```

Now let's add the `group` before `Y`
```js
document.body.insertBefore(group, Y)
```
:arrow_down: 
```js
Group
├─ A
├─ B
└─ C

(document)
└─ body
   ├─ X
   ├─ A
   ├─ B
   ├─ C
   ├─ Y
   └─ Z
```

Expectations
```js
console.log(group.firstChild === A)          // true
console.log(A.parentNode === document.body)  // true
console.log(X.nextSibling === A)             // true
console.log(C.nextSibling === Y)             // true
```

---

Accessing properties of children that are part of `group`:
Reading node properties always reflects the "real" tree - not the `Group` logical ownership.

```js
group.append(A, B, C)
```
:arrow_down: 
```js
Group
├─ A
├─ B
└─ C

(document)
└─ body // No children.
```
:arrow_down: 
```js
console.log(group.firstChild === A)  // true
console.log(A.parentNode === null)   // true
console.log(A.isConnected === false) // true
console.log(A.nextSibling === null)  // true
```

Now connect `group`

```js
document.body.append(group)
```
:arrow_down: 
```js
Group
├─ A
├─ B
└─ C

(document)
└─ body
   ├─ A
   ├─ B
   └─ C
```
:arrow_down: 
```js
console.log(group.firstChild === A)           // true
console.log(A.parentNode === document.body)   // true
console.log(A.isConnected === true)           // true
console.log(A.nextSibling === B)              // true
```

---
