import React from 'react'
import { DropTarget } from 'react-dnd'
import _ from 'lodash'

function moveTask (props, monitor, component) {
  if (!component) return
  const delta = monitor.getDifferenceFromInitialOffset()
  const item = monitor.getItem()
  if (!item) return

  let left = item.left + delta.x
  let top = item.top + delta.y

  // snap to grid
  const unitX = 3000 / props.column
  const unitY = 1000 / props.row
  ;[left, top] = [
    Math.round(left / unitX) * unitX,
    Math.round(top / unitY) * unitY
  ]

  window.requestAnimationFrame(() => props.moveTask(item.number, left, top))
}

class GanttBody extends React.PureComponent {
  render () {
    return this.props.connentDropTarget(
      <div className="gantt-body">
        {Array.from({ length: 60 }).map(() => <div className="column" />)}
      </div>
    )
  }
}
export default DropTarget(
  Symbol.for('Task'),
  {
    canDrop () {
      return true
    },
    drop: moveTask,
    hover: _.throttle(moveTask, 60)
  },
  connect => ({
    connentDropTarget: connect.dropTarget()
  })
)(GanttBody)
