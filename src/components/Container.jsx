import React from 'react'
import { DragDropContext, DropTarget } from 'react-dnd'
import HTML5Backend from 'react-dnd-html5-backend'
import ItemType from './ItemType'
import Task from './Task'
import { generateTask } from './test'
import _ from 'lodash'
import produce from 'immer'

// 所有的 getBoundingClientRect 应该统一放到组件的 this 上，在相应鼠标事件开始的时候去拿，
// 然后也要放到 requestAnimationFrame 中

// 所有带 requestAnimationFrame 的事件函数中需要判断当前是否已经在执行 requestAnimationFrame
// 如果是则直接 return

function moveTask(props, monitor, component) {
  if (!component || !monitor) return
  // const delta = monitor.getDifferenceFromInitialOffset()
  const clientOffset = monitor.getSourceClientOffset()
  const item = monitor.getItem()
  if (!item || !clientOffset) return

  // console.log(component.setState)
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
  //   // component.containerDom.scrollLeft += 4
  // }
  // const overLeftEdge = clientOffset.x - rect.left
  // if (overLeftEdge < 0) {
  //   // component.containerDom.scrollLeft += -4
  // }

  // const overLeftEdge =

  // snap to grid
  const unitX = component.state.boardWidth / component.state.adjustableNum
  const unitY = component.state.boardHeight / component.state.row
  ;[left, top] = [
    Math.round(left / unitX) * unitX,
    Math.round(top / unitY) * unitY
  ]

  // 应该判断一下值是否有变化再去做setstate
  if (item.selected.length && item.inSelected) {
    window.requestAnimationFrame(() => {
      component.moveMultipleTask(
        item.selected.map(t => {
          const deltaX = -item.left + t.left
          const deltaY = -item.top + t.top
          // component.moveTask(t.number, left + deltaX, top + deltaY)
          return { number: t.number, left: left + deltaX, top: top + deltaY }
        })
      )
    })
  } else {
    window.requestAnimationFrame(() =>
      component.moveTask(item.number, left, top)
    )
  }
}

function canDrop(props, monitor) {
  return true
}

function drop(props, monitor, component) {
  // 判断是否可以放置，时间是否冲突，如果不能放置则 reset Task 位置
  const item = monitor.getItem()
  const [left, top] = [item.left, item.top]
  const thisTask = component.state.tasks[item.number]
  const tasks = component.state.tasks
  const tasksSameLine = _.filter(
    tasks,
    t => t.top === thisTask.top && t.number !== item.number
  )
  // _.forEach(tasksSameLine, t => {
  //   if (
  //     (t.left > thisTask.left && t.left < thisTask.left + thisTask.width) ||
  //     (t.left + t.width > thisTask.left &&
  //       t.left + t.width < thisTask.left + thisTask.width)
  //   )
  //     return window.requestAnimationFrame(() =>
  //       component.moveTask(item.number, left, top)
  //     )
  // })

  // 判断重叠
  if (
    _.some(
      tasksSameLine,
      t =>
        (t.left >= thisTask.left && t.left <= thisTask.left + thisTask.width) ||
        (t.left + t.width >= thisTask.left &&
          t.left + t.width <= thisTask.left + thisTask.width) ||
        (thisTask.left >= t.left &&
          thisTask.left + thisTask.width <= t.left + t.width)
    )
  ) {
    window.requestAnimationFrame(() =>
      component.moveTask(item.number, left, top)
    )
    return
  }
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
      dependencyDragging: false,
      draggingNumber: undefined,
      draggingPos: undefined,
      mouseX: 0,
      mouseY: 0,
      isTaskDragging: undefined, // 变量名起错了
      scrollMove: 0,
      selectedTasks: []
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
    document.addEventListener('mousemove', this.onContainerMouseMove)
    document.addEventListener('mouseup', this.onContainerMouseUp)
  }

  componentWillUnmount() {
    document.removeEventListener('mousemove', this.onContainerMouseMove)
    document.removeEventListener('mouseup', this.onContainerMouseUp)
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

  moveMultipleTask = tasks => {
    this.setState(
      produce(state => {
        tasks.forEach(t => {
          state.tasks[t.number].left = t.left
          state.tasks[t.number].top = t.top
        })
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

  onTaskDrag = e => {
    const clientX = e.clientX
    window.requestAnimationFrame(() => {
      const rect = this.containerDom.getBoundingClientRect()
      if (clientX > rect.right)
        this.setState({ scrollMove: (clientX - rect.right) / 5 })
      else if (clientX < rect.left)
        this.setState({ scrollMove: (clientX - rect.left) / 5 })
      else this.setState({ scrollMove: 0 })
    })
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

  scrollContainer = () => {
    // console.log(this.state.scrollMove)
    if (this.state.scrollMove) {
      this.containerDom.scrollLeft += this.state.scrollMove
    }
    this.scrollInterval = window.requestAnimationFrame(this.scrollContainer)
  }

  onTaskBeginDrag = num => {
    this.setState({ isTaskDragging: num })
    this.scrollInterval = window.requestAnimationFrame(this.scrollContainer)
  }

  onTaskEndDrag = () => {
    this.setState({ isTaskDragging: undefined })
    window.cancelAnimationFrame(this.scrollInterval)
  }

  onContainerMouseDown = e => {
    const rect = this.containerDom.getBoundingClientRect()
    this.setState({
      mouseStartX: e.clientX + this.containerDom.scrollLeft - rect.left,
      mouseStartY: e.clientY + this.containerDom.scrollTop - rect.top,
      mouseDown: true,
      selectedTasks: []
    })
  }

  onContainerMouseMove = e => {
    if (!this.state.mouseDown) return
    const clientX = e.clientX
    const clientY = e.clientY
    window.requestAnimationFrame(() => {
      if (!this.state.mouseDown) return
      const rect = this.containerDom.getBoundingClientRect()
      const mouseX = clientX + this.containerDom.scrollLeft - rect.left
      const mouseY = clientY + this.containerDom.scrollTop - rect.top
      const width = Math.abs(mouseX - this.state.mouseStartX)
      const height = Math.abs(mouseY - this.state.mouseStartY)
      this.setState({
        mouseX,
        mouseY
      })
      if (width > 1 && height > 1) {
        this.setState(
          produce(state => {
            state.selection = true
            state.selectedTasks = _
              .chain(state.tasks)
              .filter(this.isCollision)
              .map(t => t.number)
              .value()
          })
        )
      }
    })
  }

  isCollision = t => {
    const { width: sWidth, height: sHeight } = this.getSelectionStyle()
    const left = t.left
    const right = t.left + t.width
    const top = t.top
    const bottom = t.top + 40
    const sLeft = Math.min(this.state.mouseX, this.state.mouseStartX)
    const sTop = Math.min(this.state.mouseY, this.state.mouseStartY)
    return !(
      bottom < sTop ||
      top > sTop + sHeight ||
      right < sLeft ||
      left > sLeft + sWidth
    )
  }

  onContainerMouseUp = e => {
    this.setState({ selection: false, mouseDown: false })
  }

  getSelectionStyle() {
    return {
      transform: `translate3d(${Math.min(
        this.state.mouseStartX,
        this.state.mouseX
      )}px, ${Math.min(this.state.mouseStartY, this.state.mouseY)}px, 0)`,
      width: Math.abs(this.state.mouseX - this.state.mouseStartX),
      height: Math.abs(this.state.mouseY - this.state.mouseStartY)
    }
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
            onMouseDown={this.onContainerMouseDown}
            // onMouseMove={this.onContainerMouseMove}
            // onMouseUp={this.onContainerMouseUp}
          >
            {Array.from({ length: this.computeFenceLength() }).map((c, i) => (
              <div className="column" key={i} />
            ))}
            {this.state.selection ? (
              <div className="selection" style={this.getSelectionStyle()} />
            ) : null}
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
            beginDrag={this.onTaskBeginDrag}
            endDrag={this.onTaskEndDrag}
            isTaskDragging={this.state.isTaskDragging}
            onTaskDrag={this.onTaskDrag}
            selected={_.filter(this.state.tasks, t =>
              _.includes(this.state.selectedTasks, t.number)
            )}
            isSelecting={this.mouseDown}
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
      connectDropTarget: connect.dropTarget()
      // isOver: monitor.isOver()
    })
  )(Container)
)
