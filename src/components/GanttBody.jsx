import React from 'react'
import { DropTarget } from 'react-dnd'

function moveTask (props, monitor, component) {
  if (!component) return
  const delta = monitor.getDifferenceFromInitialOffset()
  const item = monitor.getItem()

  let left = item.left + delta.x
  let top = item.top + delta.y
  
  // snap to grid
  const unitX = 3000 / props.column
  const unitY = 1000 / props.row
  ;[left, top] = [Math.round(left / unitX) * unitX, Math.round(top / unitY) * unitY]

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
