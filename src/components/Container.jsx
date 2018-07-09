import React from 'react'
import { DragDropContext, DropTarget } from 'react-dnd'
import HTML5Backend from 'react-dnd-html5-backend'
// import GanttBody from './GanttBody'
import Task from './Task'
import { generateTask } from './test'
import _ from 'lodash'
import produce from 'immer'

function moveTask(props, monitor, component) {
  if (!component) return
  const delta = monitor.getDifferenceFromInitialOffset()
  const item = monitor.getItem()
  if (!item) return

  let left = item.left + delta.x
  let top = item.top + delta.y

  // snap to grid
  const unitX = component.state.boardWidth / component.state.adjustableNum
  const unitY = component.state.boardHeight / component.state.row
  ;[left, top] = [
    Math.round(left / unitX) * unitX,
    Math.round(top / unitY) * unitY
  ]

  window.requestAnimationFrame(() => component.moveTask(item.number, left, top))
}

function canDrop(props, monitor) {
  return true
}

function drop(props, monitor, component) {
  // 判断是否可以放置，时间是否冲突，如果不能放置则 reset Task 位置
  // const item = monitor.getItem()
  // const thisTask = component.state.tasks[item.number]
  // const tasks = component.state.tasks
  // const tasksSameLine = _.filter(tasks, t => t.top === thisTask.top)
  // _.forEach(tasksSameLine, t => {
  //   if (
  //     (t.left > thisTask.left && t.left < thisTask.left + thisTask.width) ||
  //     (t.left + t.width > thisTask.left &&
  //       t.left + t.width < thisTask.left + thisTask.width)
  //   )
  //     return component.moveTask(item.number, item.left, item.top)
  // })
  moveTask(props, monitor, component)

  // dispatch event
}
class Container extends React.PureComponent {
  constructor(props) {
    super(props)
    this.state = {
      tasks: generateTask(50),
      boardWidth: 3000,
      boardHeight: 1000,
      column: 60,
      row: 20,
      adjustableNum: 60
    }
  }

  componentDidMount() {
    this.setState(
      produce(state =>
        state.tasks.forEach(t => {
          t.left = this.computeTaskLeft(t.left)
          t.top = this.computeTaskTop(t.top)
          t.width = this.computeTaskBodyWidth(t.width)
        })
      )
    )
    window.scale = this.scale
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

  scale = (column, boardWidth = this.state.boardWidth) => {
    this.setState(
      produce(state => {
        state.tasks.forEach(t => {
          t.left =
            (t.left / (state.boardWidth / state.column)) * (boardWidth / column)
          t.width =
            (t.width / (state.boardWidth / state.column)) *
            (boardWidth / column)
        })
        state.boardWidth = boardWidth
        state.column = column
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
          oX: t.left + t.width - 5, //一个半手柄长度
          oY: t.top + 20, //半个宽度
          dX: this.state.tasks[d].left + 5,
          dY: this.state.tasks[d].top + 20
        })
      })
    })
    return res
  }

  computeTaskLeft = left => {
    const unitX = this.state.boardWidth / this.state.column
    return Math.round(left / unitX) * unitX
  }

  computeTaskTop = top => {
    const unitY = this.state.boardHeight / this.state.row
    return Math.round(top / unitY) * unitY
  }

  computeTaskBodyWidth = width => {
    const unitX = this.state.boardWidth / this.state.column
    return Math.round(width / unitX) * unitX
  }

  render() {
    return (
      <div className="container" id="container">
        {this.props.connectDropTarget(
          <div
            className="gantt-body"
            style={{
              width: this.state.boardWidth,
              height: this.state.boardHeight
            }}
          >
            {Array.from({ length: this.state.column }).map((c, i) => (
              <div className="column" key={i} />
            ))}
          </div>
        )}
        <svg
          width={this.state.boardWidth}
          height={this.state.boardHeight}
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
            column={this.state.column}
            boardWidth={this.state.boardWidth}
            adjustableNum={this.state.adjustableNum}
            taskBodyWidth={t.width}
            updateLeft={this.onTaskUpdateLeft}
            updateWidth={this.onTaskUpdateWidth}
          />
        ))}
      </div>
    )
  }
}

export default DragDropContext(HTML5Backend)(
  DropTarget(
    Symbol.for('Task'),
    {
      canDrop,
      drop,
      hover: _.throttle(moveTask, 100)
    },
    connect => ({
      connectDropTarget: connect.dropTarget()
    })
  )(Container)
)
