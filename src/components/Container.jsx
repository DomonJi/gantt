import React from 'react'
import { DragDropContext, DropTarget } from 'react-dnd'
import HTML5Backend from 'react-dnd-html5-backend'
import ItemType from './ItemType'
import Task from './Task'
import { generateTask } from './test'
import _ from 'lodash'
import produce from 'immer'

function moveTask(props, monitor, component) {
  if (!component || !monitor) return
  // const delta = monitor.getDifferenceFromInitialOffset()
  const clientOffset = monitor.getSourceClientOffset()
  const item = monitor.getItem()
  if (!item || !clientOffset) return

  const scrollLeft = component.containerDom.scrollLeft
  const scrollTop = component.containerDom.scrollTop
  const rect = component.containerDom.getBoundingClientRect()

  let left = clientOffset.x - rect.left + scrollLeft
  let top = clientOffset.y - rect.top + scrollTop

  // edge auto scroll
  // console.log(left, item.width, scrollLeft, rect.left, rect.right)
  // console.log(clientOffset.x)
  // const overRightEdge = clientOffset.x + item.width - rect.right
  // if (overRightEdge > 0) {
  //   component.containerDom.scrollLeft += 4
  // }
  // const overLeftEdge = clientOffset.x - rect.left
  // if (overLeftEdge < 0) {
  //   component.containerDom.scrollLeft += -4
  // }

  // const overLeftEdge =

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
  const item = monitor.getItem()
  const thisTask = component.state.tasks[item.number]
  const tasks = component.state.tasks
  const tasksSameLine = _.filter(tasks, t => t.top === thisTask.top)
  // debugger;
  _.forEach(tasksSameLine, t => {
    if (
      (t.left > thisTask.left && t.left < thisTask.left + thisTask.width) ||
      (t.left + t.width > thisTask.left &&
        t.left + t.width < thisTask.left + thisTask.width)
    )
      return component.moveTask(item.number, item.left, item.top)
  })
  moveTask(props, monitor, component)

  // dispatch event
}

function getQueryString(name) {
  var reg = new RegExp('(^|&)' + name + '=([^&]*)(&|$)', 'i')
  var r = window.location.search.substr(1).match(reg)
  if (r != null) return unescape(r[2])
  return null
}

class Container extends React.PureComponent {
  constructor(props) {
    super(props)
    this.state = {
      tasks: generateTask(getQueryString('num') || 50),
      boardWidth: 6000,
      boardHeight: 768,
      column: 60,
      row: 16,
      adjustableNum: 240,
      // 下边这些状态是用于拖拽依赖连线的时候画线用的
      // 实际上有更好的办法，就是把container作为依赖连线拖拽的droptarget
      // 在hover handler中处理这些逻辑
      // 这样子还能方便做自动滚屏的操作
      dependencyDragging: false,
      draggingNumber: undefined,
      draggingPos: undefined,
      mouseX: 0,
      mouseY: 0
    }
    // this.draggingMouseMove = _.throttle(this.draggingMouseMove, 60)
    // this.onWheel = _.throttle(this.onWheel, 100)
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
    // window.scale = this.scale
    this.containerDom = document.getElementById('container')
    // window.requestAnimationFrame(() => {
    //   const rect = this.containerDom.getBoundingClientRect()
    //   this.containerLeftOffset = rect.left
    //   this.containerTopOffset = rect.top
    //   console.log(this.containerLeftOffset, this.containerTopOffset)
    // })
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
    // if (!boardWidth)
    //   boardWidth = (this.state.boardWidth * column) / this.state.column
    boardWidth = Math.max(
      this.containerDom.getBoundingClientRect().width,
      boardWidth
    )
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
    // 此时还需要设置正确的scrollLeft值来保证当前窗口位置不变
    // 有点小复杂
  }

  onWheel = e => {
    // if (e.deltaY > 0)
    //   window.requestAnimationFrame(() =>
    //     this.scale(this.state.column, Math.round(this.state.boardWidth / 1.05))
    //   )
    // if (e.deltaY < 0)
    const deltaY = e.deltaY
    window.requestAnimationFrame(() =>
      this.scale(
        this.state.column,
        Math.round(this.state.boardWidth * (1 - deltaY / 2000))
      )
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

  // onDependencyMouseMove = (pos, number, x, y) => {
  //   this.setState(produce(state => {
  //     state.draggingNumber = number
  //     state.dependencyDragging = true
  //     state.mouseX = x
  //     state.mouseY = y
  //     state.draggingPos = pos
  //   }))
  // }

  // renderDependencyDragging() {
  //   if (!this.state.dependencyDragging) return
  //   const draggingTask = this.state.tasks[this.state.draggingNumber]
  //   if (this.state.draggingPos === 'right') {
  //     return <line
  //       x1={draggingTask.left +draggingTask.width} y1={draggingTask.top + 40}
  //       x2={this.state.mouseX} y2={this.state.mouseY}
  //     ></line>
  //   }
  // }

  addDependency = (originNum, depenNum) => {
    this.setState(
      produce(state => {
        state.tasks[originNum].dependencies.push(depenNum)
      })
    )
  }

  dependencyBeginDrag = ({ number, pos, monitor }) => {
    this.setState(
      produce(state => {
        state.draggingNumber = number
        state.draggingPos = pos
        state.dependencyDragging = true
      })
    )
    // this.dragInterval = setInterval(this.draggingMouseMove(monitor), 60)
    window.requestAnimationFrame(this.draggingMouseMove(monitor))
  }

  dependencyEndDrag = () => {
    // clearInterval(this.dragInterval)
    this.setState(
      produce(state => {
        state.dependencyDragging = false
      })
    )
  }

  draggingMouseMove = monitor => () => {
    // 这边实现的繁琐了
    // if (!this.state.dependencyDragging) return
    if (!monitor || !monitor.getClientOffset()) return

    const rect = this.containerDom.getBoundingClientRect()
    // scrollLeft Top也应该存入state做成响应式
    const mouseX =
      monitor.getClientOffset().x + this.containerDom.scrollLeft - rect.left
    const mouseY =
      monitor.getClientOffset().y + this.containerDom.scrollTop - rect.top
    this.setState({
      mouseX,
      mouseY
    })
    if (this.state.dependencyDragging)
      window.requestAnimationFrame(this.draggingMouseMove(monitor))
  }

  renderDraggingBezier() {
    if (!this.state.dependencyDragging) return
    const curTask = this.state.tasks[this.state.draggingNumber]
    const x =
      this.state.draggingPos === 'left'
        ? curTask.left + 5
        : curTask.left + curTask.width + 5
    const y = curTask.top + 20
    const x1 = this.state.draggingPos === 'left' ? x - 100 : x + 100
    const x2 =
      this.state.draggingPos === 'left'
        ? this.state.mouseX + 100
        : this.state.mouseX - 100
    return (
      <path
        d={`M${x} ${y}C${x1},${y} ${x2},${this.state.mouseY} ${
          this.state.mouseX
        },${this.state.mouseY}`}
        stroke="#e8a917"
        fill="none"
        style={{ strokeWidth: '1px' }}
      />
    )
  }

  computeFenceLength(min = 60, max = 150) {
    // let [length, unitX] = [this.state.column, this.state.boardWidth / this.state.column]
    // for (; unitX >= min && unitX <= max; ) {
    //   debugger
    //   if (unitX < min) length = Math.round(length / 1.2)
    //   if (unitX > max) length = Math.round(length * 1.2)
    //   unitX = this.state.boardWidth / length
    // }
    // return length
    const unitX = this.state.boardWidth / this.state.column
    if (unitX < 40) return 24
    if (unitX > 120) return 240
    return this.state.column
  }

  onBoardClick = e => {
    const rect = this.containerDom.getBoundingClientRect()
    console.log(rect)
    const left = this.computeTaskLeft(
      e.clientX + this.containerDom.scrollLeft - rect.left
    )
    const top = this.computeTaskTop(
      e.clientY + this.containerDom.scrollTop - rect.top
    )
    this.setState(
      produce(state => {
        const unitX = state.boardWidth / state.column
        const width = 5 * unitX
        state.tasks.push({
          number: state.tasks.length,
          left,
          top,
          width,
          dependencies: []
        })
        // state.boardWidth = Math.max(state.boardWidth, left + width + unitX + 10)
        if (left + width + 10 > state.boardWidth) {
          state.boardWidth += 6 * unitX
          state.column += 6
        }
      })
    )
  }

  render() {
    return (
      <div
        className="container"
        id="container"
        onMouseMove={this.draggingMouseMove}
        onWheel={this.onWheel}
      >
        {this.props.connectDropTarget(
          <div
            className="gantt-body"
            style={{
              width: this.state.boardWidth,
              height: this.state.boardHeight
            }}
            onDoubleClick={this.onBoardClick}
          >
            {Array.from({ length: this.computeFenceLength() }).map((c, i) => (
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
              stroke="rgb(183, 191, 198)"
              style={{ strokeWidth: '1px' }}
              fill="none"
              key={`${d.origin}-${d.dependence}`}
            />
          ))}
          {this.renderDraggingBezier()}
        </svg>
        {this.state.tasks.map(t => (
          <Task
            id={`task-${t}`}
            key={t.number}
            number={t.number}
            dependencies={t.dependencies}
            left={t.left}
            top={t.top}
            column={this.state.column}
            boardWidth={this.state.boardWidth}
            adjustableNum={this.state.adjustableNum}
            taskBodyWidth={t.width}
            updateLeft={this.onTaskUpdateLeft}
            updateWidth={this.onTaskUpdateWidth}
            // dependencyMouseMove={this.onDependencyMouseMove}
            addDependency={this.addDependency}
            dependencyBeginDrag={this.dependencyBeginDrag}
            dependencyEndDrag={this.dependencyEndDrag}
            // isOver={this.props.isOver}
          />
        ))}
      </div>
    )
  }
}

export default DragDropContext(HTML5Backend)(
  DropTarget(
    ItemType.Task,
    {
      canDrop,
      drop,
      hover(props, monitor, component) {
        window.requestAnimationFrame(() => moveTask(props, monitor, component))
      }
    },
    (connect, monitor) => ({
      connectDropTarget: connect.dropTarget(),
      // isOver: monitor.isOver()
    })
  )(Container)
)
