The items that are used in the slot must specify the `key` property because they are internally used inside a `transition-group`.

The `transitionName` property sets the `name` property of the internal `transition-group`. Default to `dnd-list`.

The `listItemClass` property defines a class that is applied to the element that wraps individual list items. Defaults to `dnd-list-item`. This class is also applied to the helper item.

The `helperItemClass` property defines a class that is applied to the helper wrapper element. Defaults to `dnd-helper-item`.

The `itemKeyProperty` property tells `vue-dnd-list` what property of items in `v-model` to use as key in the transition-group. Defaults to using the item index as key.

The `helperItemKey` property is the key to use for the helper item in the transition group. Defaults to `-1`.

The `activationDelay` property specifies a delay until sorting is activated after starting to drag. If `activationDistance` is also specified, `activationDelay` takes precedence.

The `activationDistance` property specifies a distance that must be dragged before sorting is activated. If `activationDelay` is also specified, `activationDelay` takes precedence.

The slot content is repeated for each element in `v-model` and scoped with the following data:

* `listItem` - Element data of `v-model`.
* `index` - Index of the element in `v-model`.
* `isGhost` - True for the item that is chosen for dragging.
* `helper` - Object for the helper item, null otherwise.
  * _TODO: make these_
* `sorting` - Specifies whether sorting is active or not.
* `settling` - Specifies whether sorting has recently finished and transitions are settling.
* `startDrag` - Selects the item for dragging. Intended to be called in response to a `mousedown` event on the areas of the list items that the user wants to be draggable.

Note that an item can be a ghost despite not actively sorting. This happens before sorting has been activated due to press delay and drag threshold constraints, if used. It also happens during the settling phase after sorting has ended.

Helper item markup can be provided in a slot named `helper`. If not present, the main slot is used for the helper item. Both kinds of slots are scoped the same way.
