import React from 'react'
import { DragSource } from 'react-dnd'
import _ from 'lodash'
import ItemType from './ItemType'

function className (props) {
  return `task-dependency-handle dependency-handle-${props.pos}`
}

const DenpendencyDraggble = props =>
  props.connectDragSource(
    <div
      className={className(props)}
      // id={`dependency-${props.number}-${props.pos}`}
    />
  )

export default DragSource(
  ItemType.DenpendencyDraggble,
  {
    // 在beginDrag中dispatch一个action通知Container的svg画线
    beginDrag (props, monitor, component) {
      props.dependencyBeginDrag({
        number: props.number,
        pos: props.pos,
        monitor
      })
      return {
        number: props.number,
        pos: props.pos
      }
    },
    endDrag (props, monitor, component) {
      props.dependencyEndDrag()
    }
  },
  (connect, monitor) => ({
    connectDragSource: connect.dragSource(),
    isDragging: monitor.isDragging()
  })
)(DenpendencyDraggble)
