import React from 'react'
import { DragDropContext } from 'react-dnd'
import HTML5Backend from 'react-dnd-html5-backend'
import GanttBody from './GanttBody'
import GanttHeader from './GanttHeader'
import Task from './Task'
import _ from 'lodash'

class Container extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      tasks: [
        {
          number: 0,
          left: 100,
          top: 100,
          width: 200,
          dependencies: [1, 2]
        },
        {
          number: 1,
          left: 300,
          top: 200,
          width: 200,
          dependencies: []
        },
        {
          number: 2,
          left: 500,
          top: 100,
          width: 100,
          dependencies: [4]
        },
        {
          number: 3,
          left: 150,
          top: 400,
          width: 60,
          dependencies: [4]
        },
        {
          number: 4,
          left: 600,
          top: 400,
          width: 150,
          dependencies: []
        }
      ],
      draggingTask: 0,
      draggingTaskDom: null
    }
  }

  onDropTask = () => {
    const taskDom = document.getElementById(
      `task-${this.state.draggingTask.props.number}`
    )
    console.log(taskDom)
    if (!taskDom) return
    const rect = taskDom.getBoundingClientRect()
    return {
      left: rect.left,
      top: rect.top
    }
  }

  onBeginDrag = task => {
    this.setState(
      () => ({
        draggingTask: task
      }),
      () => {
        this.setState({
          taskDom: document.getElementById(
            `task-${this.state.draggingTask.props.number}`
          )
        })
      }
    )
  }

  onTaskUpdateLeft = (number, left) => {
    this.setState(prev => ({
      tasks: prev.tasks.map(
        t => (t.number === number ? Object.assign(t, { left }) : t)
      )
    }))
  }

  onTaskUpdateWidth = (number, width) => {
    this.setState(prev => ({
      tasks: prev.tasks.map(
        t => (t.number === number ? Object.assign(t, { width }) : t)
      )
    }))
  }

  moveTask = (number, left, top) => {
    this.setState(prev => ({
      tasks: prev.tasks.map(t => {
        return t.number === number ? Object.assign(t, { left, top }) : t
      })
    }))
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
      <div className="container">
        <GanttBody
          // dropTask={this.onDropTask}
          // draggingTask={this.state.draggingTask}
          moveTask={this.moveTask}
          column={60}
          row={15}
        />
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

export default DragDropContext(HTML5Backend)(Container)
