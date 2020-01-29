/**
 * @license
 * Visual Blocks Editor
 *
 * Copyright 2011 Google Inc.
 * https://developers.google.com/blockly/
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Core JavaScript library for Blockly.
 * @author fraser@google.com (Neil Fraser)
 */
'use strict';

/**
 * The top level namespace used to access the Blockly library.
 * @namespace Blockly
 **/
goog.provide('Blockly');

goog.require('Blockly.BlockSvg.render');
goog.require('Blockly.Events');
goog.require('Blockly.FieldAngle');
goog.require('Blockly.FieldCheckbox');
goog.require('Blockly.FieldColour');
// Date picker commented out since it increases footprint by 60%.
// Add it only if you need it.
//goog.require('Blockly.FieldDate');
goog.require('Blockly.FieldDropdown');
goog.require('Blockly.FieldImage');
goog.require('Blockly.FieldTextInput');
goog.require('Blockly.FieldNumber');
goog.require('Blockly.FieldVariable');
goog.require('Blockly.Generator');
goog.require('Blockly.Msg');
goog.require('Blockly.Procedures');
goog.require('Blockly.Toolbox');
goog.require('Blockly.Touch');
goog.require('Blockly.WidgetDiv');
goog.require('Blockly.WorkspaceSvg');
goog.require('Blockly.constants');
goog.require('Blockly.inject');
goog.require('Blockly.utils');

goog.require('goog.color');


// Turn off debugging when compiled.
// Unused within the Blockly library, but used in Closure.
/* eslint-disable no-unused-vars */
var CLOSURE_DEFINES = {'goog.DEBUG': false};
/* eslint-enable no-unused-vars */

/**
 * The main workspace most recently used.
 * Set by Blockly.WorkspaceSvg.prototype.markFocused
 * @type {Blockly.Workspace}
 */
Blockly.mainWorkspace = null;

/**
 * Currently selected block.
 * @type {Blockly.Block}
 */
Blockly.selected = null;

/**
 * Block currently in the process of transferring and connections that would
 * be connected to each other when block's transferring is done.
 * The block must be a root block.
 * @type {!Object}
 */
Blockly.transferring = {
  block: null,
  localConnection: null,
  pendingTargetConnection: null
};

/**
 * All of the connections on blocks that are currently being dragged.
 * @type {!Array.<!Blockly.Connection>}
 * @private
 */
Blockly.draggingConnections_ = [];

/**
 * Contents of the local clipboard.
 * @type {Element}
 * @private
 */
Blockly.clipboardXml_ = null;

/**
 * Source of the local clipboard.
 * @type {Blockly.WorkspaceSvg}
 * @private
 */
Blockly.clipboardSource_ = null;

/**
 * Cached value for whether 3D is supported.
 * @type {!boolean}
 * @private
 */
Blockly.cache3dSupported_ = null;

 /**
   * @type {!Array.<!Blockly.Events.Abstract>} WS型
   * @protected
   */
Blockly.globalUndoStack = [];

  /**
   * @type {!Array.<!Blockly.Events.Abstract>} WS型
   * @protected
   */
Blockly.globalRedoStack = [];

// Where to highlight.
Blockly.selectedConnection = null;
Blockly.selectedNextConnection = null;
Blockly.selectedBlock = null;
Blockly.childBlock_ = null;

/**
 * Convert a hue (HSV model) into an RGB hex triplet.
 * @param {number} hue Hue on a colour wheel (0-360).
 * @return {string} RGB code, e.g. '#5ba65b'.
 */
Blockly.hueToRgb = function(hue) {
  return goog.color.hsvToHex(hue, Blockly.HSV_SATURATION,
      Blockly.HSV_VALUE * 255);
};

/**
 * Returns the dimensions of the specified SVG image.
 * @param {!Element} svg SVG image.
 * @return {!Object} Contains width and height properties.
 */
Blockly.svgSize = function(svg) {
  return {
    width: svg.cachedWidth_,
    height: svg.cachedHeight_
  };
};

/**
 * Size the workspace when the contents change.  This also updates
 * scrollbars accordingly.
 * @param {!Blockly.WorkspaceSvg} workspace The workspace to resize.
 */
Blockly.resizeSvgContents = function(workspace) {
  workspace.resizeContents();
};

/**
 * Size the SVG image to completely fill its container. Call this when the view
 * actually changes sizes (e.g. on a window resize/device orientation change).
 * See Blockly.resizeSvgContents to resize the workspace when the contents
 * change (e.g. when a block is added or removed).
 * Record the height/width of the SVG image.
 * @param {!Blockly.WorkspaceSvg} workspace Any workspace in the SVG.
 */
Blockly.svgResize = function(workspace) {
  var mainWorkspace = workspace;
  while (mainWorkspace.options.parentWorkspace) {
    mainWorkspace = mainWorkspace.options.parentWorkspace;
  }
  var svg = mainWorkspace.getParentSvg();
  var div = svg.parentNode;
  if (!div) {
    // Workspace deleted, or something.
    return;
  }
  var width = div.offsetWidth;
  var height = div.offsetHeight;
  if (svg.cachedWidth_ != width) {
    svg.setAttribute('width', width + 'px');
    svg.cachedWidth_ = width;
  }
  if (svg.cachedHeight_ != height) {
    svg.setAttribute('height', height + 'px');
    svg.cachedHeight_ = height;
  }
  mainWorkspace.resize();
};

// Creating function for key operation.
Blockly.createByKey = function(workspace, type) {
  if (Blockly.selectedConnection == null) {
    return;
  }
  var inputConnection = Blockly.selectedConnection;
  workspace.redoStack_ = [];
  Blockly.globalRedoStack = [];
  var xml = goog.dom.createDom('block',{'type': type});
  Blockly.Events.setGroup(true);
  var block = Blockly.Xml.domToBlock(xml, workspace);
  block.outputConnection.connect(inputConnection);
  Blockly.Events.setGroup(false);
}

Blockly.createByNextKey = function(workspace, type) {
  workspace.redoStack_ = [];
  Blockly.globalRedoStack = [];
  if (Blockly.selectedNextConnection == null) {
    var xml = goog.dom.createDom('block',{'type': type});
    Blockly.Events.setGroup(true);
    var block = Blockly.Xml.domToBlock(xml, workspace);
    Blockly.Events.setGroup(false);
    return;
  }
  var next = Blockly.selectedNextConnection;
  var xml = goog.dom.createDom('block',{'type': type});
  Blockly.Events.setGroup(true);
  var block = Blockly.Xml.domToBlock(xml, workspace);
  block.previousConnection.connect(next);
  Blockly.Events.setGroup(false);
}

Blockly.highlightReset = function() {
  if (Blockly.selectedConnection) {
    var inputConnection = Blockly.selectedConnection;
    inputConnection.unhighlight();
    Blockly.selectedConnection = null;
  }
}

/**
 * Handle a key-down on SVG drawing surface.
 * @param {!Event} e Key down event.
 * @private
 */
Blockly.onKeyDown_ = function(e) {
  if (Blockly.mainWorkspace.options.readOnly || Blockly.utils.isTargetInput(e)) {
    // No key actions on readonly workspaces.
    // When focused on an HTML text input widget, don't trap any keys.
    return;
  }
  var deleteBlock = false;
  var workspace = Blockly.mainWorkspace;
  var block;
  if (!Blockly.selectedBlock) {
    block = workspace.getTopBlocks(true)[0];
  } else {
    block = Blockly.selectedBlock;
  }
  var childBlock = Blockly.childBlock_;
  if (e.keyCode == 27) {
    // Pressing esc closes the context menu.
    Blockly.hideChaff();
  } else if (e.keyCode == 8 || e.keyCode == 46) {
    // Delete or backspace.
    // Stop the browser from going back to the previous page.
    // Do this first to prevent an error in the delete code from resulting in
    // data loss.
    e.preventDefault();
;    // Don't delete while dragging.  Jeez.
    if (Blockly.mainWorkspace.isDragging()) {
      return;
    }
    if (Blockly.selected && Blockly.selected.isDeletable()) {
      if (Blockly.selectedBlock.parentBlock_) {
        var connection;
        if (Blockly.selectedBlock.outputConnection) {
          connection = block.outputConnection.targetConnection;
          connection.highlight();
          Blockly.selectedConnection = connection;
        } else if (Blockly.selectedBlock.previousConnection) {
          connection = block.previousConnection.targetConnection;
          connection.highlight();
          Blockly.selectedNextConnection = connection;
        }
        Blockly.selectedBlock = block.parentBlock_;
      } else {
        Blockly.selectedConnection = null;
        Blockly.selectedNextConnection = null;
        Blockly.selectedBlock = null;
        Blockly.childBlock_ = null;
      }
      deleteBlock = true;
    }
  } else if (e.keyCode == 39) {
    // right key = 39
    if (e.shiftKey) {
      Blockly.highlightReset();
      Blockly.processRL(childBlock);
    } else {
      console.log(block);
      Blockly.processRL(block);
    }
  } else if (e.keyCode == 37) {
    // left key = 37
    if (e.shiftKey) {
      Blockly.highlightReset();
      Blockly.processRL(block.parentBlock_);
    }
  } else if (e.keyCode == 40) {
    // down key = 40
    Blockly.processUD(block, block.getNextBlock());
  } else if (e.keyCode == 38) {
    // up key = 38
    Blockly.processUD(block, block.getParent());
  }
  // Create block by key operation.
  else if (e.keyCode == 48) {
    // 0 key = 48
    if (e.shiftKey) {
      Blockly.createByKey(workspace, 'float_typed');
    } else {
      Blockly.createByKey(workspace, 'int_typed');
    }
  } else if (e.keyCode == 187){
    // ; + key = 187
    Blockly.createByKey(workspace, 'int_arithmetic_typed');
  } else if (e.keyCode == 65) {
    // a key = 65
    Blockly.createByKey(workspace, 'int_abs_typed');
  } else if (e.keyCode == 190){
    // . key = 190
    Blockly.createByKey(workspace, 'float_arithmetic_typed');
  } else if (e.keyCode == 83) {
    // s key = 83
    Blockly.createByKey(workspace, 'float_sqrt_typed');
  } else if (e.keyCode == 50){
    // 2 " key = 50
    if (e.shiftKey) {
      Blockly.createByKey(workspace, 'string_typed');
    }
  } else if (e.keyCode == 67){
    // ^ key = 67
    if (e.shiftKey) {
      Blockly.createByKey(workspace, 'concat_string_typed');
    }
  } else if (e.keyCode == 188){
    // = key = 189
      Blockly.createByKey(workspace, 'logic_compare_typed');
  } else if (e.keyCode == 54) {
    // 6 key = 54
    if (e.shiftKey) {
      Blockly.createByKey(workspace, 'logic_operator_typed');
    }
  } else if (e.keyCode == 78) {
    // n key = 78
    Blockly.createByKey(workspace, 'not_operator_typed');
  } else if (e.keyCode == 66) {
    // b key = 66
    Blockly.createByKey(workspace, 'logic_boolean_typed');
  } else if (e.keyCode == 73) {
    // i key = 73
    Blockly.createByKey(workspace, 'logic_ternary_typed');
  } else if (e.keyCode == 76) {
    // l key = 76
    if (e.shiftKey) {
      Blockly.createByKey(workspace, 'let_typed');
    } else {
      Blockly.createByNextKey(workspace, 'letstatement_typed');
    }
  } else if (e.keyCode == 70) {
    // f key = 70
    Blockly.createByNextKey(workspace, 'letstatement_fun_pattern_typed');
  } else if (e.keyCode == 77) {
    // m key = 77
    Blockly.createByKey(workspace, 'match_typed');
  } else if (e.keyCode == 80) {
    // p key = 80
    Blockly.createByKey(workspace, 'pair_create_typed');
  } else if (e.keyCode == 84) {
    // t key = 84
    Blockly.createByNextKey(workspace, 'defined_recordtype_typed');
  } else if (e.keyCode == 219) {
    // [ key = 219
    if (e.shiftKey) {
      Blockly.createByKey(workspace, 'list_empty_typed');
    } else {
      Blockly.createByKey(workspace, 'lists_create_with_typed');
    }
  } else if (e.keyCode == 186) {
    // : key = 186
    Blockly.createByKey(workspace, 'list_cons_typed');
  }
  else if (e.altKey || e.ctrlKey || e.metaKey) {
    // Don't use meta keys during drags.
    if (Blockly.mainWorkspace.isDragging()) {
      return;
    }
    if (Blockly.selected &&
        Blockly.selected.isDeletable() && Blockly.selected.isMovable()) {
      // Don't allow copying immovable or undeletable blocks. The next step
      // would be to paste, which would create additional undeletable/immovable
      // blocks on the workspace.
      if (e.keyCode == 67) {
        // 'c' for copy.
        Blockly.hideChaff();
        Blockly.copy_(Blockly.selected);
      } else if (e.keyCode == 88 && !Blockly.selected.workspace.isFlyout) {
        // 'x' for cut, but not in a flyout.
        // Don't even copy the selected item in the flyout.
        Blockly.copy_(Blockly.selected);
        deleteBlock = true;
      }
    }
    if (e.keyCode == 86) {
      // 'v' for paste.
      if (Blockly.clipboardXml_) {
        Blockly.Events.setGroup(true);
        // Pasting always pastes to the main workspace, even if the copy started
        // in a flyout workspace.
        var workspace = Blockly.clipboardSource_;
        if (workspace.isFlyout) {
          workspace = workspace.targetWorkspace;
        }
        workspace.paste(Blockly.clipboardXml_);
        Blockly.Events.setGroup(false);
      }
    } else if (e.keyCode == 90) {
      // 'z' for undo 'Z' is for redo.
      // TODO(harukam): Support undo events in the proper workspace. Due to
      // implementation of workbench and workspace transferring, there is need
      // to undo events on other workspaces (not the main workspace.)
      Blockly.hideChaff();
      Blockly.undo(e.shiftKey);
    }
  }
  // Common code for delete and cut.
  // Don't delete in the flyout.
  if (deleteBlock && !Blockly.selected.workspace.isFlyout) {
    if (goog.isFunction(deleteBlock.canBeUnplugged) &&
        deleteBlock.canBeUnplugged.call(deleteBlock)) {
      return;
    }
    Blockly.Events.setGroup(true);
    Blockly.hideChaff();
    Blockly.selected.dispose(/* heal */ true, true);
    Blockly.Events.setGroup(false);
  }
};

/**
 * Copy a block or workspace comment onto the local clipboard.
 * @param {!Blockly.Block | !Blockly.WorkspaceComment} toCopy Block or Workspace Comment
 *    to be copied.
 * @private
 */
Blockly.copy_ = function(toCopy) {
  if (toCopy.isComment) {
    var xml = toCopy.toXmlWithXY();
  } else {
    if (!toCopy.isCopyable()) {
      // TODO(harukam): Tell users why the block can not be copied.
      Blockly.alert('These blocks can not be copied.');
      return;
    }
    var xml = Blockly.Xml.blockToDom(toCopy);
    // Copy only the selected block and internal blocks.
    Blockly.Xml.deleteNext(xml);
    // Encode start position in XML.
    var xy = toCopy.getRelativeToSurfaceXY();
    xml.setAttribute('x', toCopy.RTL ? -xy.x : xy.x);
    xml.setAttribute('y', xy.y);
  }
  Blockly.clipboardXml_ = xml;
  Blockly.clipboardSource_ = toCopy.workspace;
};

/**
 * Duplicate this block and its children, or a workspace comment.
 * @param {!Blockly.Block | !Blockly.WorkspaceComment} toDuplicate Block or
 *     Workspace Comment to be copied.
 * @private
 */
Blockly.duplicate_ = function(toDuplicate) {
  // Save the clipboard.
  var clipboardXml = Blockly.clipboardXml_;
  var clipboardSource = Blockly.clipboardSource_;

  // Create a duplicate via a copy/paste operation.
  Blockly.copy_(toDuplicate);
  toDuplicate.workspace.paste(Blockly.clipboardXml_);

  // Restore the clipboard.
  Blockly.clipboardXml_ = clipboardXml;
  Blockly.clipboardSource_ = clipboardSource;
};

/**
 * Cancel the native context menu, unless the focus is on an HTML input widget.
 * @param {!Event} e Mouse down event.
 * @private
 */
Blockly.onContextMenu_ = function(e) {
  if (!Blockly.utils.isTargetInput(e)) {
    // When focused on an HTML text input widget, don't cancel the context menu.
    e.preventDefault();
  }
};

/**
 * Close tooltips, context menus, dropdown selections, etc.
 * @param {boolean=} opt_allowToolbox If true, don't close the toolbox.
 */
Blockly.hideChaff = function(opt_allowToolbox) {
  Blockly.Tooltip.hide();
  Blockly.WidgetDiv.hide();
  if (!opt_allowToolbox) {
    var workspace = Blockly.getMainWorkspace();
    if (workspace.toolbox_ &&
        workspace.toolbox_.flyout_ &&
        workspace.toolbox_.flyout_.autoClose) {
      workspace.toolbox_.clearSelection();
    }
  }
};

// Highlight connection with right and left key.
Blockly.processRL = function(block) {
  if(block.length === 0){
    return;
  }
    Blockly.selectedBlock = block;
    block.unselect();
    for (var j = 0, input; input = block.inputList[j]; j++) {
      if (input.type == Blockly.INPUT_VALUE) {
        if (Blockly.selectedConnection == null) {
          if (Blockly.selectedNextConnection) {
            Blockly.selectedNextConnection.unhighlight();
            Blockly.selectedNextConnection = null;
            block.select();
          }
          input.connection.highlight();
          Blockly.selectedConnection = input.connection;
          Blockly.childBlock_ = input.connection.targetBlock();
          return;
        }
        if (Blockly.selectedConnection == input.connection) {
          Blockly.selectedConnection = null;
          input.connection.unhighlight();
          if (j == block.inputList.length -1) {
            block.select();
          }
          continue;
        }
      }
    }
}

// Highlight connection with up and down key.
Blockly.processUD = function(block,getBlock) {
  if(block.length === 0){
    return;
  }
  block.unselect();
  if (Blockly.selectedConnection || !Blockly.selectedBlock) {
    Blockly.highlightReset();
    Blockly.selectedBlock = block;
    block.select();
    return;
  }
  if (Blockly.selectedNextConnection) {
    Blockly.selectedNextConnection.unhighlight();
    Blockly.selectedNextConnection == null;
    Blockly.selectedBlock = getBlock;
  } else {
    Blockly.selectedBlock = block;
  }
  var next = Blockly.selectedBlock.nextConnection;
  if (next.type == Blockly.NEXT_STATEMENT) {
      next.highlight();
      Blockly.selectedNextConnection = next;
  }
}

/**
 * Undo or redo the previous action.
 * @param {boolean} redo False if undo, true if redo.
 */
Blockly.undo = function(redo) {
    var inputStack = redo ? Blockly.globalRedoStack : Blockly.globalUndoStack;
    var outputStack = redo ? Blockly.globalUndoStack : Blockly.globalRedoStack;
    var inputWorkspace = inputStack.slice(-1)[0];
    if (!inputWorkspace) {
      return;
    }
    var groupid = inputWorkspace.groupid;
    inputWorkspace.workspace.undo(redo);

    var globalInputStack =
      redo ? Blockly.globalRedoStack : Blockly.globalUndoStack;
    var globalOutputStack =
      redo ? Blockly.globalUndoStack : Blockly.globalRedoStack;
    if (globalInputStack.length > 0) {
      if (globalInputStack.slice(-1)[0].groupid === groupid) {
        var inputWorkspace2 = globalInputStack.slice(-1)[0];
        if (!inputWorkspace2) {
          return;
        }
        Blockly.undo(redo);
      }
    }
    // outputStack = Blockly.globalRedoStack;
};

/**
 * When something in Blockly's workspace changes, call a function.
 * @param {!Function} func Function to call.
 * @return {!Array.<!Array>} Opaque data that can be passed to
 *     removeChangeListener.
 * @deprecated April 2015
 */
Blockly.addChangeListener = function(func) {
  // Backwards compatibility from before there could be multiple workspaces.
  console.warn(
      'Deprecated call to Blockly.addChangeListener, ' +
      'use workspace.addChangeListener instead.');
  return Blockly.getMainWorkspace().addChangeListener(func);
};

/**
 * Returns the main workspace.  Returns the last used main workspace (based on
 * focus).  Try not to use this function, particularly if there are multiple
 * Blockly instances on a page.
 * @return {!Blockly.Workspace} The main workspace.
 */
Blockly.getMainWorkspace = function() {
  return Blockly.mainWorkspace;
};

/**
 * Wrapper to window.alert() that app developers may override to
 * provide alternatives to the modal browser window.
 * @param {string} message The message to display to the user.
 * @param {function()=} opt_callback The callback when the alert is dismissed.
 */
Blockly.alert = function(message, opt_callback) {
  window.alert(message);
  if (opt_callback) {
    opt_callback();
  }
};

/**
 * Wrapper to window.confirm() that app developers may override to
 * provide alternatives to the modal browser window.
 * @param {string} message The message to display to the user.
 * @param {!function(boolean)} callback The callback for handling user response.
 */
Blockly.confirm = function(message, callback) {
  callback(window.confirm(message));
};

/**
 * Wrapper to window.prompt() that app developers may override to provide
 * alternatives to the modal browser window. Built-in browser prompts are
 * often used for better text input experience on mobile device. We strongly
 * recommend testing mobile when overriding this.
 * @param {string} message The message to display to the user.
 * @param {string} defaultValue The value to initialize the prompt with.
 * @param {!function(string)} callback The callback for handling user response.
 */
Blockly.prompt = function(message, defaultValue, callback) {
  callback(window.prompt(message, defaultValue));
};

/**
 * Helper function for defining a block from JSON.  The resulting function has
 * the correct value of jsonDef at the point in code where jsonInit is called.
 * @param {!Object} jsonDef The JSON definition of a block.
 * @return {function()} A function that calls jsonInit with the correct value
 *     of jsonDef.
 * @private
 */
Blockly.jsonInitFactory_ = function(jsonDef) {
  /** @this Blockly.Block */
  return function() {
    this.jsonInit(jsonDef);
  };
};

/**
 * Define blocks from an array of JSON block definitions, as might be generated
 * by the Blockly Developer Tools.
 * @param {!Array.<!Object>} jsonArray An array of JSON block definitions.
 */
Blockly.defineBlocksWithJsonArray = function(jsonArray) {
  for (var i = 0; i < jsonArray.length; i++) {
    var elem = jsonArray[i];
    if (!elem) {
      console.warn(
          'Block definition #' + i + ' in JSON array is ' + elem + '. ' +
          'Skipping.');
    } else {
      var typename = elem.type;
      if (typename == null || typename === '') {
        console.warn(
            'Block definition #' + i +
            ' in JSON array is missing a type attribute. Skipping.');
      } else {
        if (Blockly.Blocks[typename]) {
          console.warn(
              'Block definition #' + i + ' in JSON array' +
              ' overwrites prior definition of "' + typename + '".');
        }
        Blockly.Blocks[typename] = {
          init: Blockly.jsonInitFactory_(elem)
        };
      }
    }
  }
};

/**
 * Bind an event to a function call.  When calling the function, verifies that
 * it belongs to the touch stream that is currently being processed, and splits
 * multitouch events into multiple events as needed.
 * @param {!EventTarget} node Node upon which to listen.
 * @param {string} name Event name to listen to (e.g. 'mousedown').
 * @param {Object} thisObject The value of 'this' in the function.
 * @param {!Function} func Function to call when event is triggered.
 * @param {boolean=} opt_noCaptureIdentifier True if triggering on this event
 *     should not block execution of other event handlers on this touch or other
 *     simultaneous touches.
 * @param {boolean=} opt_noPreventDefault True if triggering on this event
 *     should prevent the default handler.  False by default.  If
 *     opt_noPreventDefault is provided, opt_noCaptureIdentifier must also be
 *     provided.
 * @return {!Array.<!Array>} Opaque data that can be passed to unbindEvent_.
 */
Blockly.bindEventWithChecks_ = function(node, name, thisObject, func,
    opt_noCaptureIdentifier, opt_noPreventDefault) {
  var handled = false;
  var wrapFunc = function(e) {
    var captureIdentifier = !opt_noCaptureIdentifier;
    // Handle each touch point separately.  If the event was a mouse event, this
    // will hand back an array with one element, which we're fine handling.
    var events = Blockly.Touch.splitEventByTouches(e);
    for (var i = 0, event; event = events[i]; i++) {
      if (captureIdentifier && !Blockly.Touch.shouldHandleEvent(event)) {
        continue;
      }
      Blockly.Touch.setClientFromTouch(event);
      if (thisObject) {
        func.call(thisObject, event);
      } else {
        func(event);
      }
      handled = true;
    }
  };

  var bindData = [];
  if (goog.global.PointerEvent && (name in Blockly.Touch.TOUCH_MAP)) {
    for (var i = 0, type; type = Blockly.Touch.TOUCH_MAP[name][i]; i++) {
      node.addEventListener(type, wrapFunc, false);
      bindData.push([node, type, wrapFunc]);
    }
  } else {
    node.addEventListener(name, wrapFunc, false);
    bindData.push([node, name, wrapFunc]);

    // Add equivalent touch event.
    if (name in Blockly.Touch.TOUCH_MAP) {
      var touchWrapFunc = function(e) {
        wrapFunc(e);
        // Calling preventDefault stops the browser from scrolling/zooming the
        // page.
        var preventDef = !opt_noPreventDefault;
        if (handled && preventDef) {
          e.preventDefault();
        }
      };
      for (var i = 0, type; type = Blockly.Touch.TOUCH_MAP[name][i]; i++) {
        node.addEventListener(type, touchWrapFunc, false);
        bindData.push([node, type, touchWrapFunc]);
      }
    }
  }
  return bindData;
};


/**
 * Bind an event to a function call.  Handles multitouch events by using the
 * coordinates of the first changed touch, and doesn't do any safety checks for
 * simultaneous event processing.
 * @deprecated in favor of bindEventWithChecks_, but preserved for external
 * users.
 * @param {!EventTarget} node Node upon which to listen.
 * @param {string} name Event name to listen to (e.g. 'mousedown').
 * @param {Object} thisObject The value of 'this' in the function.
 * @param {!Function} func Function to call when event is triggered.
 * @return {!Array.<!Array>} Opaque data that can be passed to unbindEvent_.
 */
Blockly.bindEvent_ = function(node, name, thisObject, func) {
  var wrapFunc = function(e) {
    if (thisObject) {
      func.call(thisObject, e);
    } else {
      func(e);
    }
  };

  var bindData = [];
  var window = goog.global['window'];
  if (window && window.PointerEvent && (name in Blockly.Touch.TOUCH_MAP)) {
    for (var i = 0, type; type = Blockly.Touch.TOUCH_MAP[name][i]; i++) {
      node.addEventListener(type, wrapFunc, false);
      bindData.push([node, type, wrapFunc]);
    }
  } else {
    node.addEventListener(name, wrapFunc, false);
    bindData.push([node, name, wrapFunc]);

    // Add equivalent touch event.
    if (name in Blockly.Touch.TOUCH_MAP) {
      var touchWrapFunc = function(e) {
        // Punt on multitouch events.
        if (e.changedTouches && e.changedTouches.length == 1) {
          // Map the touch event's properties to the event.
          var touchPoint = e.changedTouches[0];
          e.clientX = touchPoint.clientX;
          e.clientY = touchPoint.clientY;
        }
        wrapFunc(e);

        // Stop the browser from scrolling/zooming the page.
        e.preventDefault();
      };
      for (var i = 0, type; type = Blockly.Touch.TOUCH_MAP[name][i]; i++) {
        node.addEventListener(type, touchWrapFunc, false);
        bindData.push([node, type, touchWrapFunc]);
      }
    }
  }
  return bindData;
};

/**
 * Unbind one or more events event from a function call.
 * @param {!Array.<!Array>} bindData Opaque data from bindEvent_.
 *     This list is emptied during the course of calling this function.
 * @return {!Function} The function call.
 */
Blockly.unbindEvent_ = function(bindData) {
  while (bindData.length) {
    var bindDatum = bindData.pop();
    var node = bindDatum[0];
    var name = bindDatum[1];
    var func = bindDatum[2];
    node.removeEventListener(name, func, false);
  }
  return func;
};

/**
 * Is the given string a number (includes negative and decimals).
 * @param {string} str Input string.
 * @return {boolean} True if number, false otherwise.
 */
Blockly.isNumber = function(str) {
  return /^\s*-?\d+(\.\d+)?\s*$/.test(str);
};

/**
 * Checks old colour constants are not overwritten by the host application.
 * If a constant is overwritten, it prints a console warning directing the
 * developer to use the equivalent Msg constant.
 * @package
 */
Blockly.checkBlockColourConstants = function() {
  Blockly.checkBlockColourConstant_(
      'LOGIC_HUE', ['Blocks', 'logic', 'HUE'], undefined);
  Blockly.checkBlockColourConstant_(
      'LOGIC_HUE', ['Constants', 'Logic', 'HUE'], 210);
  Blockly.checkBlockColourConstant_(
      'LOOPS_HUE', ['Blocks', 'loops', 'HUE'], undefined);
  Blockly.checkBlockColourConstant_(
      'LOOPS_HUE', ['Constants', 'Loops', 'HUE'], 120);
  Blockly.checkBlockColourConstant_(
      'MATH_HUE', ['Blocks', 'math', 'HUE'], undefined);
  Blockly.checkBlockColourConstant_(
      'MATH_HUE', ['Constants', 'Math', 'HUE'], 230);
  Blockly.checkBlockColourConstant_(
      'TEXTS_HUE', ['Blocks', 'texts', 'HUE'], undefined);
  Blockly.checkBlockColourConstant_(
      'TEXTS_HUE', ['Constants', 'Text', 'HUE'], 160);
  Blockly.checkBlockColourConstant_(
      'LISTS_HUE', ['Blocks', 'lists', 'HUE'], undefined);
  Blockly.checkBlockColourConstant_(
      'LISTS_HUE', ['Constants', 'Lists', 'HUE'], 260);
  Blockly.checkBlockColourConstant_(
      'COLOUR_HUE', ['Blocks', 'colour', 'HUE'], undefined);
  Blockly.checkBlockColourConstant_(
      'COLOUR_HUE', ['Constants', 'Colour', 'HUE'], 20);
  Blockly.checkBlockColourConstant_(
      'VARIABLES_HUE', ['Blocks', 'variables', 'HUE'], undefined);
  Blockly.checkBlockColourConstant_(
      'VARIABLES_HUE', ['Constants', 'Variables', 'HUE'], 330);
  // Blockly.Blocks.variables_dynamic.HUE never existed.
  Blockly.checkBlockColourConstant_(
      'VARIABLES_DYNAMIC_HUE', ['Constants', 'VariablesDynamic', 'HUE'], 310);
  Blockly.checkBlockColourConstant_(
      'PROCEDURES_HUE', ['Blocks', 'procedures', 'HUE'], undefined);
  // Blockly.Constants.Procedures.HUE never existed.
};

/**
 * Checks for a constant in the Blockly namespace, verifying it is undefined or
 * has the old/original value. Prints a warning if this is not true.
 * @param {string} msgName The Msg constant identifier.
 * @param {Array<string>} blocklyNamePath The name parts of the tested
 *     constant.
 * @param {number|undefined} expectedValue The expected value of the constant.
 * @private
 */
Blockly.checkBlockColourConstant_ = function(
    msgName, blocklyNamePath, expectedValue) {
  var namePath = 'Blockly';
  var value = Blockly;
  for (var i = 0; i < blocklyNamePath.length; ++i) {
    namePath += '.' + blocklyNamePath[i];
    if (value) {
      value = value[blocklyNamePath[i]];
    }
  }

  if (value && value !== expectedValue) {
    var warningPattern = (expectedValue === undefined) ?
        '%1 has been removed. Use Blockly.Msg["%2"].' :
        '%1 is deprecated and unused. Override Blockly.Msg["%2"].';
    var warning = warningPattern.replace('%1', namePath).replace('%2', msgName);
    console.warn(warning);
  }
};

// IE9 does not have a console.  Create a stub to stop errors.
if (!goog.global['console']) {
  goog.global['console'] = {
    'log': function() {},
    'warn': function() {}
  };
}

// Export symbols that would otherwise be renamed by Closure compiler.
if (!goog.global['Blockly']) {
  goog.global['Blockly'] = {};
}
goog.global['Blockly']['getMainWorkspace'] = Blockly.getMainWorkspace;
goog.global['Blockly']['addChangeListener'] = Blockly.addChangeListener;
