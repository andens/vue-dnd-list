The `orientation` property determines whether the list is horizontal (`x`) or vertical (`y`).

The `scrollContainerClass` property is the class to apply to the wrapper element around sortable items. Defaults to `dnd-scroll-container`.

The `transitionName` property sets the `name` property of the internal `transition` elements. Default to `dnd-list`.

The `listItemClass` property defines a class that is applied to the element that wraps individual list items. Defaults to `dnd-list-item`. This class is also applied to the helper item.

The `helperItemClass` property defines a class that is applied to the helper wrapper element. Defaults to `dnd-helper-item`.

The `itemKeyProperty` property tells `vue-dnd-list` what property of items in `v-model` to use as key in the rendered HTML. Defaults to using the item index as key.

The `helperItemKey` property is the key to use for the helper item. Defaults to `-1`.

The `activationDelay` property specifies a delay until sorting is activated after starting to drag. If `activationDistance` is also specified, `activationDelay` takes precedence.

The `activationDistance` property specifies a distance that must be dragged before sorting is activated. If `activationDelay` is also specified, `activationDelay` takes precedence.

The `helperZ` property sets the z-index to use for the wrapper of the helper item. It's a bit of a hack to work around some transition issues where the use of transform creates a new stacking context for the helper item as it's being transitioned, making its z-index independent of the other items. Defaults to 0.

The `maxItemTransitionDuration` property is the duration in milliseconds for items to transition into place after being swapped. It's prefixed with _max_ because it is the duration for a clean swap; interrupting currently transitioning items do not reset the transition time but rather finishes in less time based on how far they have already transitioned. A value greater than 0 enables the transition, during which a `<name>-move` class is applied, where `<name>` is given by the `transitionName` property. Defaults to 0.

The `scrollContainerEvents` property is an object of event handlers that are bound to the scroll container. Defaults to null.

The slot content is repeated for each element in `v-model` and scoped with the following data:

* `listItem` - Element data of `v-model`.
* `index` - Index of the element in `v-model`.
* `isGhost` - True for the item that is chosen for dragging.
* `isHelper` - True for the helper item.
* `sorting` - Specifies whether sorting is active or not.
* `settling` - Specifies whether sorting has recently finished and transitions are settling.
* `startDrag` - Selects the item for dragging. Intended to be called in response to a `mousedown` event on the areas of the list items that the user wants to be draggable.

Note that an item can be a ghost despite not actively sorting. This happens before sorting has been activated due to press delay and drag threshold constraints, if used. It also happens during the settling phase after sorting has ended.

Helper item markup can be provided in a slot named `helper`. If not present, the main slot is used for the helper item. Both kinds of slots are scoped the same way. The facade item is rendered outside of the scroll container such that it does not interfere with the scroll dimensions when dragged beyong the container bounds.

If the list items change viewport position under circumstances beyond the control of `vue-dnd-list` while sorting is active, `synchronizeHelperTranslation` may be called on a `SortableContainer` instance to immediately synchronize the helper position. This moves the helper item into place and sorts items according to the updated position.

When the facade item is removed, the `left` and `right` styles are set to match the target element position. The `transform` style is set to offset the item to where it was when dropped. With this the user can transition the facade during the settling phase. Remember, using `!important` for the `transform` property overrides the inline style.

== Internal details

`NodeTracker` is used to track a sorted array of nodes that corresponds to the elements in `value`. `ListItem` instances update the tracker as they are created, destroyed, and detect changes in their `index` property.

Directives were investigated, but a separate component could look for changes specifically in index. Considering that it didn't work to just pass the container instance, a separate object had to be used and dependency injection turned out to be a clean way of doing so (as in vue-slicksort).

The helper node is also tracked in `NodeTracker`. Emitting an event from the helper item component when it's destroyed doesn't work as the transition continues. Instead, we need to check whether the `after-leave` invocation was done for the helper node. Using the node tracker we can compare against the element that the helper added.
