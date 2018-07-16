import React from 'react'
import { DragSource, DropTarget } from 'react-dnd'
import DependencyDraggble from './DependencyDraggble'
import { getEmptyImage } from 'react-dnd-html5-backend'
import _ from 'lodash'
import ItemType from './ItemType'

function getStyles(props) {
  const { left, top, isDragging, isTaskDragging, number } = props
  const transform = `translate3d(${left - 10}px, ${top}px, 0)`

  return {
    position: 'absolute',
    transform,
    opacity: isDragging ? 0.2 : 1,
    pointerEvents:
      isDragging || (isTaskDragging !== number && isTaskDragging) ? 'none' : ''
  }
}

class Task extends React.PureComponent {
  constructor(props) {
    super(props)
    this.state = {
      leftHandleDragging: false,
      rightHandleDragging: false,
      // leftDependencyHandleDragging: false,
      // rightDependencyHandleDragging: false
      hover: false
    }
    this.startPoint = React.createRef()
    this.endPoint = React.createRef()
    this.onHandleMouseMove = _.throttle(this.onHandleMouseMove, 100)
    this.randomColor = [
      'rgb(253, 154, 0)',
      'white',
      'rgb(232, 56, 79)',
      'rgb(20, 170, 245)',
      'rgb(0, 191, 156)',
      'white'
    ][Math.round(Math.random() * 5)]
  }

  // static getDerivedStateFromProps(props, state) {
  //   this.setState({hover: props.isOver})
  // }

  componentDidMount() {
    document.addEventListener('mouseup', this.onHandleMouseUp)
    this.containerDom = document.getElementById('container')
  }

  componentWillUnmount() {
    document.removeEventListener('mouseup', this.onHandleMouseUp)
  }

  onHandleMouseDown = pos => () => {
    this.setState({ [`${pos}HandleDragging`]: true })
    document.addEventListener('mousemove', this.onHandleMouseMove)
  }

  onHandleMouseUp = () => {
    if (
      !this.state.leftHandleDragging &&
      !this.state.rightHandleDragging
      // !this.state.leftDependencyHandleDragging &&
      // !this.state.rightDependencyHandleDragging
    )
      return
    this.setState({
      leftHandleDragging: false,
      rightHandleDragging: false
      // leftDependencyHandleDragging: false,
      // rightDependencyHandleDragging: false
    })
    document.removeEventListener('mousemove', this.onHandleMouseMove)
  }

  onHandleMouseMove = e => {
    if (this.state.leftHandleDragging || this.state.rightHandleDragging) {
      const unitX = this.props.boardWidth / this.props.adjustableNum
      let mouseX =
        Math.round(
          (e.clientX +
            this.containerDom.scrollLeft -
            this.containerDom.getBoundingClientRect().left) /
            unitX
        ) *
          unitX +
        5
      const handleWidth = 10
      const taskRight = this.props.left + handleWidth + this.props.taskBodyWidth
      if (this.state.rightHandleDragging) {
        mouseX = Math.max(
          mouseX,
          this.props.left + unitX + handleWidth / 2
        )
        this.props.updateWidth(
          this.props.number,
          mouseX - handleWidth / 2 - this.props.left
        )
      } else {
        mouseX = Math.min(
          mouseX,
          this.props.left + this.props.taskBodyWidth - unitX + handleWidth / 2
        )
        this.props.updateWidth(
          this.props.number,
          taskRight - mouseX - handleWidth / 2
        )
        this.props.updateLeft(this.props.number, mouseX - handleWidth / 2)
      }
    }
    // else if (this.state.leftDependencyHandleDragging) {
    //   this.props.dependencyMouseMove(
    //     'left',
    //     this.props.number,
    //     e.pageX + this.containerDom.scrollLeft,
    //     e.pageY + this.containerDom.scrollTop
    //   )
    // } else if (this.state.rightDependencyHandleDragging) {
    //   this.props.dependencyMouseMove(
    //     'right',
    //     this.props.number,
    //     e.pageX + this.containerDom.scrollLeft,
    //     e.pageY + this.containerDom.scrollTop
    //   )
    // }
  }

  render() {
    return (
      <div
        className={`task${
          this.state.leftHandleDragging || this.state.rightHandleDragging
            ? ' handle-dragging'
            : ''
        }${this.props.isDragging ? ' is-dragging' : ''}`}
        style={getStyles(this.props)}
      >
        <div
          className="task-handle handle-left"
          ref={this.startPoint}
          onMouseDown={this.onHandleMouseDown('left')}
          style={{ backgroundColor: this.randomColor }}
        />
        <DependencyDraggble
          pos="left"
          number={this.props.number}
          dependencyBeginDrag={this.props.dependencyBeginDrag}
          dependencyEndDrag={this.props.dependencyEndDrag}
          color={this.randomColor}
        />
        {this.props.connectDropTarget(
          this.props.connectDragSource(
            <div
              className={`task-body${this.props.isOver ? ' hover' : ''}`}
              id={this.props.id}
              style={{
                width: this.props.taskBodyWidth,
                backgroundColor: this.randomColor
              }}
              onDrag={this.props.onTaskDrag}
            />
          )
        )}
        <DependencyDraggble
          pos="right"
          number={this.props.number}
          dependencyBeginDrag={this.props.dependencyBeginDrag}
          dependencyEndDrag={this.props.dependencyEndDrag}
          color={this.randomColor}
        />
        <div
          className="task-handle handle-right"
          ref={this.endPoint}
          onMouseDown={this.onHandleMouseDown('right')}
          style={{ backgroundColor: this.randomColor }}
        />
      </div>
    )
  }
}

export default DragSource(
  ItemType.Task,
  {
    beginDrag(props, monitor, component) {
      props.beginDrag(props.number)
      return {
        number: props.number,
        left: props.left,
        top: props.top,
        width: props.taskBodyWidth
      }
    },
    endDrag(props) {
      props.endDrag()
    }
  },
  (connect, monitor) => ({
    connectDragSource: connect.dragSource(),
    connectDragPreview: connect.dragPreview(),
    isDragging: monitor.isDragging()
  })
)(
  DropTarget(
    ItemType.DenpendencyDraggble,
    {
      canDrop(props, monitor) {
        const item = monitor.getItem()
        return props.number !== item.number
      },
      drop(props, monitor, component) {
        // console.log(monitor.getItem())
        const item = monitor.getItem()
        if (item.pos === 'right') props.addDependency(item.number, props.number)
        else props.addDependency(props.number, item.number)
      }
    },
    (connect, monitor) => ({
      connectDropTarget: connect.dropTarget(),
      isOver: monitor.isOver()
    })
  )(Task)
)
