The items that are used in the slot must specify the `key` property because they are internally used inside a `transition-group`.

The `transitionName` property sets the `name` property of the internal `transition-group`. Default to `dnd-list`.

The slot content is repeated for each element in `v-model` and scoped with the following data:

* `listItem` - Element data of `v-model`.
* `index` - Index of the element in `v-model`.
* `isGhost` - True for the item that is chosen for dragging.

Note that an item can be a ghost despite not actively sorting. This happens before sorting has been activated due to press delay and drag threshold constraints, if used. It also happens during the settling phase after sorting has ended.
