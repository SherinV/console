/* Copyright Contributors to the Open Cluster Management project */
'use strict'

import React from 'react'
import PropTypes from 'prop-types'
import { global_BackgroundColor_dark_100 as editorBackground } from '@patternfly/react-tokens'
import { DecorationType } from '../utils/source-utils'

class YamlEditor extends React.Component {
  static propTypes = {
    addEditor: PropTypes.func,
    editor: PropTypes.element,
    hide: PropTypes.bool,
    decorationRows: PropTypes.array,
    onYamlChange: PropTypes.func,
    readOnly: PropTypes.bool,
    showCondensed: PropTypes.bool,
    theme: PropTypes.string,
    yaml: PropTypes.oneOfType([PropTypes.object, PropTypes.string]),
  }

  constructor(props) {
    super(props)

    const { editor, onYamlChange } = this.props
    this.state = {
      editor:
        editor &&
        React.cloneElement(editor, {
          language: 'yaml',
          height: '100%',
          width: '100%',
          options: {
            wordWrap: 'wordWrapColumn',
            wordWrapColumn: 132,
            wordWrapMinified: false,
            scrollBeyondLastLine: true,
            smoothScrolling: true,
            glyphMargin: true,
            tabSize: 2,
            scrollbar: {
              verticalScrollbarSize: 17,
              horizontalScrollbarSize: 17,
            },
          },
          editorDidMount: this.editorDidMount.bind(this),
          editorWillMount: this.editorWillMount.bind(this),
          onChange: onYamlChange,
        }),
    }
  }

  editorWillMount(monaco) {
    monaco.editor.defineTheme('resource-editor', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'number', foreground: 'ace12e' },
        { token: 'type', foreground: '73bcf7' },
        { token: 'string', foreground: 'f0ab00' },
        { token: 'keyword', foreground: 'cbc0ff' },
      ],
      colors: {
        'editor.background': editorBackground.value,
        'editorGutter.background': '#292e34', // no pf token defined
        'editorLineNumber.activeForeground': '#fff',
        'editorLineNumber.foreground': '#f0f0f0',
      },
    })
    monaco.editor.defineTheme('readonly-resource-editor', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'number', foreground: 'b0b0b0' },
        { token: 'type', foreground: 'b0b0b0' },
        { token: 'string.yaml', foreground: '#b0b0b0' },
        { token: 'keyword', foreground: 'b0b0b0' },
      ],
      colors: {
        'editor.background': '#e0e0e0',
        'editorGutter.background': '#e0e0e0', // no pf token defined
        'editorLineNumber.activeForeground': '#000000',
        'editorLineNumber.foreground': '#000000',
      },
    })
    // Monaco uses <span> to measure character sizes
    // therefore make sure <span> has the right font
    let stylesheet = document.querySelector('link[href*=main]')
    if (stylesheet) {
      stylesheet = stylesheet.sheet
      stylesheet.insertRule('span { font-family: monospace }', stylesheet.cssRules.length)
    }
  }

  editorDidMount(editor, monaco) {
    const { addEditor } = this.props
    editor.layout()
    editor.focus()
    editor.monaco = monaco
    editor.decorations = []
    if (addEditor) {
      addEditor(editor)
    }
    this.editor = editor

    // remove the rule setting <span> font
    let stylesheet = document.querySelector('link[href*=main]')
    if (stylesheet) {
      stylesheet = stylesheet.sheet
      stylesheet.deleteRule(stylesheet.cssRules.length - 1)
    }

    monaco.editor.setModelLanguage(editor.getModel(), 'yaml')

    editor.changeViewZones((changeAccessor) => {
      const domNode = document.createElement('div')
      changeAccessor.addZone({
        afterLineNumber: 0,
        heightInPx: 10,
        domNode: domNode,
      })
    })

    editor.onKeyDown(
      ((e) => {
        // determine readonly ranges
        const prohibited = []
        const { decorationRows = [] } = this.props
        decorationRows.forEach((obj) => {
          if (obj.decorationType === DecorationType.IMMUTABLE) {
            prohibited.push(new this.editor.monaco.Range(obj.$r + 1, 0, obj.$r + 1, 132))
          }
        })

        // if user presses enter, add new key: below this line
        let endOfLineEnter = false
        if (e.code === 'Enter') {
          const model = this.editor.getModel()
          const pos = this.editor.getPosition()
          const thisLine = model.getLineContent(pos.lineNumber)
          endOfLineEnter = thisLine.length < pos.column
        }

        // prevent typing on readonly ranges
        const selections = this.editor.getSelections()
        if (
          // if user clicks on readonly area, ignore
          !(e.code === 'KeyC' && (e.ctrlKey || e.metaKey)) &&
          e.code !== 'ArrowDown' &&
          e.code !== 'ArrowUp' &&
          e.code !== 'ArrowLeft' &&
          e.code !== 'ArrowRight' &&
          !endOfLineEnter &&
          !prohibited.every((prohibit) => {
            return selections.findIndex((range) => prohibit.intersectRanges(range)) === -1
          })
        ) {
          e.stopPropagation()
          e.preventDefault()
        }
      }).bind(this)
    )
  }

  shouldComponentUpdate(nextProps) {
    return (
      this.props.yaml !== nextProps.yaml ||
      this.props.hide !== nextProps.hide ||
      this.props.readOnly !== nextProps.readOnly ||
      this.props.showCondensed !== nextProps.showCondensed
    )
  }

  componentDidUpdate() {
    // stop flickering
    if (this.editor && this.editor.getModel()) {
      const model = this.editor.getModel()
      model.forceTokenization(model.getLineCount())
    }
  }

  render() {
    const { yaml, readOnly, hide = false, showCondensed } = this.props
    let { theme = 'resource-editor' } = this.props
    const { editor } = this.state
    const style = {
      display: hide ? 'none' : 'block',
      minHeight: '100px',
    }
    if (readOnly) {
      style.borderLeft = '1px solid #c8c8c8'
      theme = 'readonly-resource-editor'
    }
    return (
      <div className="yamlEditorContainer" style={style}>
        {editor &&
          React.cloneElement(editor, {
            value: yaml,
            theme,
            options: {
              ...this.state.editor.props.options,
              wordWrapColumn: showCondensed ? 512 : 256,
              minimap: {
                enabled: !showCondensed,
              },
              readOnly,
            },
          })}
      </div>
    )
  }
}

export default YamlEditor
