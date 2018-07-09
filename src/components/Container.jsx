import React from 'react'
import { DragDropContext, DropTarget } from 'react-dnd'
import HTML5Backend from 'react-dnd-html5-backend'
// import GanttBody from './GanttBody'
import Task from './Task'
import { generateTask } from './test'
import _ from 'lodash'
import produce from 'immer'

function moveTask (props, monitor, component) {
  if (!component) return
  const delta = monitor.getDifferenceFromInitialOffset()
  const item = monitor.getItem()
  if (!item) return

  let left = item.left + delta.x
  let top = item.top + delta.y

  // snap to grid
  const unitX = 3000 / 60
  const unitY = 1000 / 15
  ;[left, top] = [
    Math.round(left / unitX) * unitX,
    Math.round(top / unitY) * unitY
  ]

  window.requestAnimationFrame(() => component.moveTask(item.number, left, top))
}

function drop(props, monitor, component) {
  // 判断是否可以放置，时间是否冲突，如果不能放置则 reset Task 位置
  moveTask(props, monitor, component)

  // dispatch event
}
class Container extends React.PureComponent {
  constructor(props) {
    super(props)
    this.state = {
      tasks: generateTask(100),
    }
  }

  onTaskUpdateLeft = (number, left) => {
    this.setState(
      produce(state => {
        state.tasks[number].left = left
      })
    )
  }

  onTaskUpdateWidth = (number, width) => {
    this.setState(
      produce(state => {
        state.tasks[number].width = width
      })
    )
  }

  moveTask = (number, left, top) => {
    this.setState(
      produce(state => {
        state.tasks[number].left = left
        state.tasks[number].top = top
      })
    )
  }

  computeDependencies() {
    const res = []
    _.forEach(this.state.tasks, t => {
      _.forEach(t.dependencies, d => {
        res.push({
          origin: t.number,
          dependence: d,
          oX: t.left + t.width + 5, //一个半手柄长度
          oY: t.top + 20, //半个宽度
          dX: this.state.tasks[d].left + 15,
          dY: this.state.tasks[d].top + 20
        })
      })
    })
    return res
  }

  render() {
    return (
      <div className="container" id="container">
        {
          this.props.connectDropTarget(
            <div className="gantt-body">
              {Array.from({ length: 60 }).map(() => <div className="column" />)}
            </div>
          )
        }
        <svg
          width="3000"
          height="1000"
          style={{ position: 'absolute', pointerEvents: 'none', zIndex: 1 }}
        >
          {_.map(this.computeDependencies(), d => (
            <path
              d={`M${d.oX} ${d.oY}C${d.oX + 100},${d.oY} ${d.dX - 100},${
                d.dY
              } ${d.dX},${d.dY}`}
              stroke="#e8a917"
              style={{ strokeWidth: '1px' }}
              fill="none"
              key={`${d.origin}-${d.dependence}`}
            />
          ))}
        </svg>
        {this.state.tasks.map(t => (
          <Task
            id={`task-${t}`}
            key={t.number}
            number={t.number}
            dependencies={t.dependencies.map(d => this.state.tasks[d])}
            left={t.left}
            top={t.top}
            column={60}
            taskBodyWidth={t.width}
            updateLeft={this.onTaskUpdateLeft}
            updateWidth={this.onTaskUpdateWidth}
          />
        ))}
      </div>
    )
  }
}

export default DragDropContext(HTML5Backend)(DropTarget(Symbol.for('Task'), {
  canDrop() {
    return true
  },
  drop,
  hover: _.throttle(moveTask, 100)
}, connect => ({
  connectDropTarget: connect.dropTarget()
}))(Container))
