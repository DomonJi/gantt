import React from 'react'
import { DropTarget } from 'react-dnd'

function moveTask (props, monitor, component) {
  if (!component) return
  const delta = monitor.getDifferenceFromInitialOffset()
  const item = monitor.getItem()

  let left = Math.round(item.left + delta.x)
  let top = Math.round(item.top + delta.y)

  props.moveTask(item.number, left, top)
}

class GanttBody extends React.PureComponent {
  render () {
    return this.props.connentDropTarget(<div className="gantt-body" />)
  }
}
export default DropTarget(
  Symbol.for('Task'),
  {
    canDrop () {
      return true
    },
    drop: moveTask,
    hover: moveTask
  },
  connect => ({
    connentDropTarget: connect.dropTarget()
  })
)(GanttBody)
