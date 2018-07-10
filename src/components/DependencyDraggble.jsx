import React from 'react'
import { DragSource } from 'react-dnd'
import _ from 'lodash'

function className (props, state) {
  return `task-dependency-handle dependency-handle-${props.pos}`
}

class DenpendencyDraggble extends React.PureComponent {
  // constructor (props) {
  //   super(props)
  //   this.draggableDom = React.createRef()
  // }
  render () {
    return this.props.connectDragSource(
      <div
        className={className(this.props, this.state)}
        // ref={this.draggableDom}
        id={`dependency-${this.props.number}-${this.props.pos}`}
      />
    )
  }
}

export default DragSource(
  Symbol.for('Dependency'),
  {
    // 在beginDrag中dispatch一个action通知Container的svg画线
    beginDrag (props, monitor, component) {
      return {
        number: props.number,
        pos: props.pos
      }
    }
  },
  (connect, monitor) => ({
    connectDragSource: connect.dragSource(),
    isDragging: monitor.isDragging()
  })
)(DenpendencyDraggble)
