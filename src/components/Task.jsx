import React from 'react'
import { DragSource } from 'react-dnd'
import { getEmptyImage } from 'react-dnd-html5-backend'
import _ from 'lodash'

function getStyles(props) {
  const { left, top, isDragging } = props
  const transform = `translate3d(${left}px, ${top}px, 0)`

  return {
    position: 'absolute',
    transform,
    opacity: isDragging ? 0.2 : 1,
    height: isDragging ? 0 : ''
  }
}

class Task extends React.PureComponent {
  constructor(props) {
    super(props)
    this.state = {
      left: 0,
      top: 0,
      leftHandleDragging: false,
      rightHandleDragging: false,
      taskBodyWidth: 200
    }
    this.startPoint = React.createRef()
    this.endPoint = React.createRef()
    this.onHandleMouseMove = _.throttle(this.onHandleMouseMove, 100)
  }

  componentDidMount() {
    document.addEventListener('mouseup', this.onHandleMouseUp)
  }

  componentWillUnmount() {
    document.removeEventListener('mouseup', this.onHandleMouseUp)
  }

  onHandleMouseDown = pos => () => {
    this.setState({ [`${pos}HandleDragging`]: true })
    document.addEventListener('mousemove',this.onHandleMouseMove)
  }

  onHandleMouseUp = () => {
    if (!this.state.leftHandleDragging && !this.state.rightHandleDragging) return
    this.setState({
      leftHandleDragging: false,
      rightHandleDragging: false,
    })
    document.removeEventListener('mousemove',this.onHandleMouseMove)
  }

  onHandleMouseMove = e => {
    if (!this.state.leftHandleDragging && !this.state.rightHandleDragging) return
    const unitX = 3000 / this.props.column
    const mouseX = Math.round((e.pageX + document.getElementById('container').scrollLeft) / unitX) * unitX + 5
    const handleWidth = 10
    const taskRight = this.props.left + handleWidth + this.props.taskBodyWidth
    if (this.state.rightHandleDragging)
      this.props.updateWidth(this.props.number, mouseX - handleWidth * 3 /2 - this.props.left)
    else {
      this.props.updateWidth(this.props.number, taskRight - mouseX - handleWidth / 2)
      this.props.updateLeft(this.props.number, mouseX - handleWidth / 2)
    }
  }

  render() {
    return (
      <div className="task" style={getStyles(this.props)}>
        <div
          className="task-handle handle-left"
          ref={this.startPoint}
          onMouseDown={this.onHandleMouseDown('left')}
        />
        {this.props.connectDragSource(
          <div
            className="task-body"
            id={this.props.id}
            style={{ width: this.props.taskBodyWidth }}
          />
        )}
        <div
          className="task-handle handle-right"
          ref={this.endPoint}
          onMouseDown={this.onHandleMouseDown('right')}
        />
      </div>
    )
  }
}

export default DragSource(
  Symbol.for('Task'),
  {
    beginDrag(props, monitor, component) {
      return {
        number: props.number,
        left: props.left,
        top: props.top
      }
    }
  },
  (connect, monitor) => ({
    connectDragSource: connect.dragSource(),
    connectDragPreview: connect.dragPreview(),
    isDragging: monitor.isDragging()
  })
)(Task)

export class TaskItem {
  constructor(start, end, dependencies) {
    this.start = start
    this.end = end
    this.dependencies = dependencies
  }
}
