/*global document, window, $, ko, debug, setTimeout, alert */
/*
 * Knockout UI Editor
 * 
 * Copyright (c) 2011 Ian Mckay
 *
 * https://github.com/madcapnmckay/Knockout-UI
 *
 * License: MIT http://www.opensource.org/licenses/mit-license.php
 *
 */
(function () {
	var savedSel = null, savedSelActiveElement = null; 

	ko.contenteditable = {
		actions: {
			viewHtmlModal: function(area) {
				var HtmlViewer =  function(html) { 
					this.template = 'htmlEditorTemplate';
					this.modalCssClass = area.modalCssClass() || 'ui-window';
					this.html = ko.observable(html);
					
					this.insert = function() {
						area.execute('overwrite', [ area, this.html() ]);
						this.modal.close();
					}.bind(this);
				};
				var viewModel = new HtmlViewer(area.html());
				
				ko.contenteditable.util.createModal(viewModel, { width: 760, height: 500 });
			},
			createHyperlinkModal: function(area) {
				// get current select and see if we are in an existing link
				var sel = rangy.getSelection(),
					range = ko.contenteditable.util.getFirstRange(),
					$node = sel !== undefined ? $(sel.anchorNode) : undefined, href, title, target;
				
				if ($node !== undefined && !$node.is('a')) {
					var childNodes =  range.cloneContents().childNodes;
					if ($node.parent().is('a')) {
						// chrome returns the inner textnode, others return an anchor itself
						$node = $node.parent();
					} else if (childNodes.length === 1) {
						// when selected the whole link we need to check the childnodes
						var $node = $(childNodes[0]);
					}	
				}
				
				if ($node !== undefined && $node.is('a')) {
					href = $node.attr('href');
					title = $node.attr('title');
					target = $node.attr('target') == '_blank';
					// select the whole node in case it was just a cursor in the center
					range.selectNode($node.get(0));
					sel.setSingleRange(range);
					ko.contenteditable.util.saveSelection();
				}
				
				var LinkPicker =  function(href, title, target) { 
					this.template = 'linkEditorTemplate';
					this.modalCssClass = area.modalCssClass() || 'ui-window';
					this.href = ko.observable(href);
					this.title = ko.observable(title);
					this.blankTarget = ko.observable(target || false);
					
					this.linkEntered = ko.dependentObservable(function() {
						return !$.IsNullOrWhiteSpace(this.href());
					}, this);
					
					this.insert = function() {
						area.execute('link', [ this.href(), this.title(), this.blankTarget() ]);
						area.save();
						this.modal.close();
					}.bind(this);
				};
				var viewModel = new LinkPicker(href, title, target);
				
				ko.contenteditable.util.createModal(viewModel, 	{ width: 760, height: 225 });
			},
			createCodeModal: function(area){
				// get current select and see if we are in an existing code block
				var sel = rangy.getSelection(),
					range = sel.rangeCount ? sel.getRangeAt(0) : null,
					$pre = sel !== undefined ? $(sel.anchorNode) : undefined,
					contents = range !== undefined ? range.cloneContents() : undefined,
					$containedNode = contents.childNodes.length == 1 ? $(contents.childNodes[0]) : undefined,
					initialValue, initialMode, existingCodeBlock;
			
				if ($pre && !$pre.is('pre[data-lang]')) {
					if ($pre.parent().is('pre[data-lang]')) {
						// chrome returns the inner textnode, others return the element itself
						$pre = $pre.parent();
					} else if ($containedNode) {
						// when selected the whole element we need to check the childnodes
						$pre = $containedNode
					}	
				}
			
				if ($pre && $pre.is('pre[data-lang]')) {
					initialValue = $pre.text();
					initialMode = $pre.attr('data-lang');
					existingCodeBlock = $pre.get(0);
				}
				
				var area = area,
					allLanguages = [
						{ name: 'JavaScript', mode: 'javascript', mime: 'text/javascript' },
						{ name: 'Json', mode: 'javascript', mime: 'application/json' },
						{ name: 'HTML', mode: 'xml', mime: 'text/html' },
						{ name: 'XML', mode: 'xml', mime: 'application/xml' },
						{ name: 'HTML mixed-mode', mode: 'htmlmixed', mime: 'text/html' },
						{ name: 'CSS', mode: 'css', mime: 'text/css' },
						{ name: 'Python', mode: 'python', mime: 'text/x-python' },
						{ name: 'PHP', mode: 'php', mime: 'application/x-httpd-php' },
						{ name: 'diff', mode: 'diff', mime: 'text/x-diff' },
						{ name: 'C', mode: 'clike', mime: 'text/x-csrc' }, 
						{ name: 'C++', mode: 'clike', mime: 'text/x-c++src' }, 
						{ name: 'C#', mode: 'clike', mime: 'text/x-java' },
						{ name: 'Java', mode: 'clike', mime: 'text/x-java' }, 
						{ name: 'Groovy', mode: 'clike', mime: 'text/x-groovy' }, 
						{ name: 'sTeX, LaTeX', mode: 'stex', mime: 'text/stex' },
						{ name: 'Haskell', mode: 'haskell', mime: 'text/x-haskell' },
						{ name: 'Smalltalk', mode: 'smalltalk', mime: 'text/x-stsrc' },
						{ name: 'PL/SQL', mode: 'plsql', mime: 'text/x-plsql' },
						{ name: 'Lua', mode: 'lua', mime: 'text/x-lua' },
						{ name: 'Scheme', mode: 'scheme', mime: 'text/x-scheme' },
						{ name: 'reStructuredText', mode: 'rst', mime: 'text/x-rst' },
						{ name: 'YAML', mode: 'yaml', mime: 'text/x-yaml' },
						{ name: 'SPARQL', mode: 'sparql', mime: 'application/x-sparql-query' }
					];
				
				var CodePreview = function(value, element) {
					this.template = 'codeEditorTemplate';
					this.modalCssClass = area.modalCssClass() || 'ui-window';
					this.code = value;
					this.element = element;
					
					this.selectedLanguageName = ko.observable();
					this.selectedLanguage = function() {
						var selectedLang = this.selectedLanguageName();
						if (selectedLang) {
							return allLanguages.filter(function(x) { return x.name === selectedLang; })[0];
						}
					}.bind(this);
					
					this.languages = ko.observableArray([]);
					
					var self = this, editor;
					
					this.afterRender = function(elements) {
						var l = self.selectedLanguage().name;
						var myTextArea = $(elements).find('#mycode').val(self.code).get(0);

						if (editor) {
							self.code = editor.getValue();
						}
						
						// clear old codeMirror
						editor = null;
						// define new one
						editor = CodeMirror(function(elt) {
							myTextArea.parentNode.replaceChild(elt, myTextArea);
						}, {
							value: self.code,
							mode:  self.selectedLanguage().mime, 
							lineNumbers: true, 
							matchBrackets: true,
							indentUnit: 4,
							indentWithTabs: true
						});
						
						// needed because the div isn't visible yet
						window.setTimeout(function() { editor.refresh(); }, 100);
					};
					
					this.insert = function() {
						var language = this.selectedLanguage();
						var restore = true;
						if (this.element) {
							// move selection
							ko.contenteditable.util.clearSavedSelection();
							
							var newSel = rangy.getSelection();
							var newRange = newSel.rangeCount ? newSel.getRangeAt(0) : null;
							newRange.selectNode(this.element);
							newSel.setSingleRange(range);
							// delete element
							$(this.element).remove();
							
							retore = false;
						}

						area.execute('code', [language.name, language.mode, language.mime, editor.getValue()], restore);
						area.save();
						this.modal.close();
					}.bind(this);
					
					this.modal;
				}
				
				var viewModel = new CodePreview(initialValue || 'some code', existingCodeBlock);
				
				var loaded = CodeMirror.listModes();
								
				// only add modes that are loaded
				for (var i = 0; i < loaded.length; i += 1) {
					var mode = loaded[i];
					for (var l = 0; l < allLanguages.length; l += 1) {
						var lang = allLanguages[l];
						if (lang.mode === mode) {
							viewModel.languages.push(lang);
						}
					}
				}
				if ($.IsNullOrWhiteSpace(initialMode)) {
					viewModel.selectedLanguageName(viewModel.languages()[0].name);
				} else {
					var langSelected = viewModel.languages().filter(function(x) { return x.name === initialMode; });
					if (langSelected.length > 0) {
						viewModel.selectedLanguageName(langSelected[0].name);
					} else {
						viewModel.selectedLanguageName(viewModel.languages()[0].name);
					}
				}
				
				ko.contenteditable.util.createModal(viewModel, 	{ width: 760, height: 468 });
			},
			createImageModal: function(area) {
				var area = area;
							
				var ImagePicker = function() {
					this.template = 'imagePickerTemplate';
					this.modalCssClass = area.modalCssClass() || 'ui-window';
					this.imageSelected = ko.observable();
					
					this.isLoading = ko.observable(true);
					this.src = ko.observable();
					this.altText = ko.observable();
					this.title = ko.observable();
					
					this.modal;
					
					this.thumbs = ko.observableArray([]);
					
					this.imageSrc = ko.dependentObservable(function() {
						return !$.IsNullOrWhiteSpace(this.src());
					}, this);
					
					this.insert = function() {
						area.execute('image', [this.src(), this.altText(), this.title()]);
						area.save();
						this.modal.close();
					}.bind(this);					
				};
				var viewModel = new ImagePicker();
				
				var Thumb = function(data, image) {
					this.src = data.src;
					this.title = data.title || '';
					this.altText = data.altText || '';
					
					this.width = 101;
					this.height = 112;
					
					this.imageWidth = image.width || 1;
					this.imageHeight = image.height || 1;
					
					this.frameWidth = ko.dependentObservable(function() {
						return 0.9 * this.width;
					}, this);
					
					this.frameHeight = ko.dependentObservable(function() {
						return 0.6 * this.width;
					}, this);
					
					this.resizeRatio = function() {
						var widthRatio = this.frameWidth() / this.imageWidth,
							heightRatio = this.frameHeight() / this.imageHeight,
							ratio = widthRatio < heightRatio ? heightRatio : widthRatio;
						return ratio; // don't resize if it already fits in the frame							
					}.bind(this);
					
					this.imageResizedWidth = ko.dependentObservable(function() {
						return Math.ceil(this.resizeRatio() * this.imageWidth);
					}, this);
					
					this.imageResizedHeight = ko.dependentObservable(function() {
						return Math.ceil(this.resizeRatio() * this.imageHeight);
					}, this);
					
					this.isSelected = ko.dependentObservable(function() {
						return viewModel.imageSelected() && viewModel.imageSelected() === this;
					}, this);
					
					this.select = function() {
						viewModel.imageSelected(this);
						viewModel.src(this.src);
						viewModel.title(this.title);
						viewModel.altText(this.altText);
					}.bind(this);
				}

				ko.contenteditable.util.createModal(viewModel, 	{ width: 760, height: 468 });
				
				// call the api to get the images	
				viewModel.isLoading(true);
				this.imagePickerHandler(function(images) {
					var idx = 0, 
						loadImage = function() {
							if (idx >= images.length) {
								viewModel.isLoading(false);
								return false;
							}
							
							var data = images[idx], image = new Image();
							image.src = data.src;
							image.onload = function() {	
								viewModel.thumbs.push(new Thumb(data, this));
								idx++;
								loadImage();
							}
						};
					// start
					loadImage();
				});
			}
		},
		util: {
			getFirstRange: function() {
				var sel = rangy.getSelection();
				return sel.rangeCount ? sel.getRangeAt(0) : null;
			},
			clearSavedSelection: function() {
				if (savedSel) {
					rangy.removeMarkers(savedSel);
				}
				savedSel = null;
			},
			saveSelection: function() {			
				if (savedSel) {
					rangy.removeMarkers(savedSel);
				}
				savedSel = rangy.saveSelection();
				//savedSelActiveElement = document.activeElement;
			},
			restoreSelection: function() {
				if (savedSel) {
					rangy.restoreSelection(savedSel, true);
					rangy.removeMarkers(savedSel);
					savedSel = null;
					/*window.setTimeout(function() {
						if (savedSelActiveElement && typeof savedSelActiveElement.focus != "undefined") {
							savedSelActiveElement.focus();
						}
					}, 1);*/
				} 
			},
			insertNode: function(node, highlight, jumpToEnd) {
				var range = ko.contenteditable.util.getFirstRange();
				if (range) {
					range.deleteContents();
					range.insertNode(node);
					if (highlight) {					
						range.selectNodeContents(node);
					} 
					var sel = rangy.getSelection();
					
					if (jumpToEnd) {
						range.setEndAfter(node);
						range.setStartAfter(node);
					} 
					sel.setSingleRange(range)
				} 
			},
			pasteHtml: function(html, highlight) {
				var el = document.createElement("div");
				el.innerHTML = html;
				var frag = document.createDocumentFragment(), node, lastNode;
				while ( (node = el.firstChild) ) {
					lastNode = frag.appendChild(node);
				}
				
				ko.contenteditable.util.insertNode(frag, highlight);
			},
			createModal : function(contents, settings) {
				settings = settings || {}, contents = contents || {}, area = this;
				var viewModel = {
					close: function() {
						$('.ui-modal, .ui-modal-shroud').fadeOut(function() { $(this).remove(); });
					},
					height: ko.observable(settings.height || 500),
					width: ko.observable(settings.width || 500),
					cssClass: ko.observable(settings.cssClass || ''),
					
					contents : contents || {}
				};
				viewModel.contents.modal = viewModel;
				if (viewModel.contents.afterRender === undefined) {
					viewModel.contents.afterRender = function() {};
				}
				
				var container = document.createElement("div");
				$('body').append(container);			
				ko.renderTemplate("modalTemplate", viewModel, { templateEngine: templateEngine }, container, "replaceNode");
			}
		},
		key: {
			enter: function(event, area) {
				// nothing done here, can't decide what the appropriate action is to normalise behavior
				//alert('enter pressed');
			}
		}, 
		command: {
			bold: function() {
				document.execCommand('bold', false, null);
				this.focus();
				this.change();
			},
			italic: function() {
				document.execCommand('italic', false, null);
				this.focus();
				this.change();
			},
			underline: function() {
				document.execCommand('underline', false, null);
				this.focus();
				this.change();
			},
			ul: function() {
				document.execCommand('insertunorderedlist', false, null);
				this.focus();
				this.change();
			},
			ol: function() {
				document.execCommand('insertorderedlist', false, null);
				this.focus();
				this.change();
			},
			paragraph: function() {
				document.execCommand('formatBlock', false, '<p>');		
				this.focus();
				this.change();
			},
			heading: function(number) {
				if (number > 0 && number < 7) {
					document.execCommand('formatBlock', false, '<H'+ number + '>');
					this.focus();
					this.change();
				}
			},
			align: function(direction) {
				switch(direction)
				{
					case 'left':
						document.execCommand('justifyleft', false, null);	
						break;
					case 'center':
						document.execCommand('justifycenter', false, null);	
						break;
					case 'right':
						document.execCommand('justifyright', false, null);	
						break;
				}
				this.focus();
				this.change();
			},
			subscript: function() {
				document.execCommand('subscript', false, null);
				this.focus();
				this.change();
			},
			superscript: function() {
				document.execCommand('superscript', false, null);
				this.focus();
				this.change();
			},
			blockquote: function() {
				document.execCommand('formatBlock', false, '<blockquote>');		
				this.focus();
				this.change();
			},
			image: function(src, alt, title) {
				
				if ($.IsNullOrWhiteSpace(src)) {
					alert("The image url must be supplied to create an image element");
					return;
				}
			
				var img = $('<img />').attr('src', src);
				if (!$.IsNullOrWhiteSpace(alt)) {
					img.attr('alt', alt);
				}
				if (!$.IsNullOrWhiteSpace(title)) {
					img.attr('title', title);
				}
				
				//ko.contenteditable.util.restoreSelection();
				ko.contenteditable.util.insertNode(img.get(0));
				this.focus();
				this.change();
			},
			link: function(href, title, blankTarget) {
				var range = ko.contenteditable.util.getFirstRange();
				if (range.collapsed) {
					ko.contenteditable.command.text.apply(this, [ 'new link' ]);
				}
			
				if ($.IsNullOrWhiteSpace(href)) {
					alert("The link must be supplied to create an anchor element");
					return;
				}				
				
				ko.contenteditable.util.saveSelection();
				document.execCommand("CreateLink", false, href);
				
				// get any links that were created and add additional elements
				var sel = rangy.getSelection();
				if (sel.rangeCount) {
					var nodes = sel.getRangeAt(0).getNodes();
					var links = [];
					for (var i = 0; i < nodes.length; i += 1) {
						var el = nodes[i], $el = $(el);
						if ($el.is('a')) {
							links.push(el);
						} else if ($el.parent().is('a')) {
							links.push($el.parent().get(0));
						}
					}
					
					for (var i = 0; i < links.length; i += 1) {
						var anchor = links[i], $anchor = $(anchor);
						if (blankTarget) {
							$anchor.attr('target', "_blank");
						}
						if (!$.IsNullOrWhiteSpace(title)) {
							$anchor.attr('title', title);
						}						
					}
				}
				ko.contenteditable.util.restoreSelection();
				this.focus();
				this.change();
			},
			code: function(lang, mode, mime, contents) {
			
				var codeSnippet = $('<pre></pre>')
										.addClass('code')
										.attr('contenteditable', 'false')
										.attr('data-lang', lang)
										.attr('data-mode', mode)
										.attr('data-mime', mime)
										.text(contents);
				
				ko.contenteditable.util.insertNode(codeSnippet.get(0), false);
				this.focus();
				this.change();
			},
			text: function(text, highlight) {
				var range = ko.contenteditable.util.getFirstRange();
				if (range) {
					var node = document.createTextNode(text);
					range.insertNode(node);
				    rangy.getSelection().setSingleRange(range);
					range.selectNode(node)
				} 
				this.focus();
			},
			overwrite : function(area, html) {
				area.dom().html(html);
				this.focus();
				this.change();
			}
		}
	}

	var templateEngine = new ko.jqueryTmplTemplateEngine(),
		Button = function(settings, parent) {
			this.name = ko.observable(settings.name);
			this.iconClass = ko.observable(settings.iconClass || "");
			this.description = ko.observable(settings.description);
			this.execCmd = ko.observable(settings.execCmd);
			this.text = ko.observable(settings.text);
			this.args = ko.observableArray(settings.args);
			this.buttons = ko.observableArray([]);
			
			var editor = parent;
			
			if (settings.buttons) {
				for (var i = 0; i < settings.buttons.length; i += 1) {
					var button = settings.buttons[i];
					this.buttons.push(new Button(button, editor));
				}
			}
			
			this.titleText = function() {
				return this.text() == undefined ? "" : this.text();
			}.bind(this);
			
			this.hasSubMenu = function () {
				return this.buttons().length > 0;
			}.bind(this);
			
			this.runCommand = function(e) {	
				e.preventDefault();
				editor.runCommand(this.execCmd(), this.args());
				return false;
			}.bind(this);
		},
		Group = function(settings, editor) {
			this.rows = ko.observableArray([]);
			this.first = false;
			this.last = false;
			
			for (var i = 0; i < settings.rows.length; i += 1) {
				var row = settings.rows[i];
				this.rows.push(new Row(row, editor));
			}
		},
		Row = function(settings, editor) {
			this.buttons = ko.observableArray([]);
			
			for (var i = 0; i < settings.buttons.length; i += 1) {
				var button = settings.buttons[i];
				this.buttons.push(new Button(button, editor));
			}
		},
		Area = function(element, editor) {
			
			var self = this, container = element, editor = editor, before;
			this.isActive = ko.observable(true);
			this.modalCssClass = editor.modalCssClass;
			
			// returns the inner html of the editable
			this.html = function() {
				return container.html();
			};
			
			// change event
			this.change = function() {
				container.trigger('contents-changed');
			};
			
			this.save = function() {
				editor.save();
			};
			
			// change event
			this.focus = function() {
				container.focus();
			};
			
			this.position = function() {
				return container.offset().left + ',' + container.offset().top;
			};
			
			// bind to events
			container
				.focus(function() {
					// call the editor, here boy!
					editor.activate(self);
				})
				.click(function() {
					// save the selection
					ko.contenteditable.util.saveSelection();
				})
				.dblclick(function() {
					// get cursor position
					var sel = rangy.getSelection();
					if (sel && sel.anchorNode) {
						editor.relativeTo(sel.anchorNode);
						editor.isPositioned(false);
					}
				})
				.bind('blur keyup paste', function(event) {
					if (before !== self.html()) {
						self.change();
					}
				}).bind('keydown', function(event) {
					switch (event.keyCode) {
						case 13: 
							ko.contenteditable.key.enter(event, self);
							break;
					}
				});
			
			this.dom = function() {
				return container;
			};
			
			this.execute = function(commandName, args, restore) {
				restore = restore || true;
				if (restore) {
					ko.contenteditable.util.restoreSelection();
				}
				ko.contenteditable.command[commandName].apply(self, args);
			};
		},
		Editor = function(settings) {
			this.isVisible = ko.observable(false);
			this.groups = ko.observableArray([]);
			this.position = ko.observable('0,0');
			this.area = ko.observable();
			this.isPositioned = ko.observable(false);
			this.modalCssClass = ko.observable(settings.modalCssClass);
			
			this.imagePickerHandler = settings.imagePickerHandler;
			
			this.relativeTo = ko.observable();

			var handler = settings.handler, snapshot;

			for (var i = 0; i < settings.groups.length; i += 1) {
				var group = settings.groups[i];
				this.groups.push(new Group(group, this));
			}
			
			// set first and last groups
			this.groups()[0].first = true;
			if (this.groups().length - 1 != 0) {
				this.groups()[this.groups().length - 1].last = true;
			}
			
			this.save = function() {
				if (this.area() && snapshot && snapshot !== this.area().html()) {
					var contents = this.area().html();
					if (handler !== undefined) {	
						handler.call(this, this.area().dom(), contents);
						// take a snapshot
						snapshot = this.area().html();
					}
				}
			};
			
			this.activate = function(content, relativeTo) {

				this.isVisible(true);
				
				if (this.area() !== content) {
					// if we are switching areas we must save
					this.save();
					this.area(content);
					this.relativeTo(undefined);
					this.isPositioned(false);
					// take a snapshot
					snapshot = this.area().html();
				}
			};
			
			this.deactivate = function() {
				this.isVisible(false);
				if (savedSel) {
					rangy.removeMarkers(savedSel);
					savedSel = null;
				}				
				// push changes to handler if  things have changed
				this.save();
			};
			
			this.left = function() {
				return this.position().split(',')[0] + 'px'
			}.bind(this);
			
			this.top = function() {
				return this.position().split(',')[1] + 'px'
			}.bind(this);
			
			this.runCommand = function(command, args) {
				if (this.area() !== undefined && savedSel) {
					if (typeof command === 'function') {
						command.apply(this, [ this.area() ].concat(args));
					} else {
						this.area().execute(command, args);
					}
				}
				return false;
			};	
			
			this.keepFocus = function() {
				return false;
			}
		};

	ko.editable = {
		defaults: { 
			debug : true,
			groups: [
				{
					last : false, first: false,
					rows: [ 
						{
							buttons: [
								{ name: 'Bold', iconClass: 'bold', description:'make the selected text bold', execCmd: 'bold' },
								{ name: 'Italic', iconClass: 'italic', description:'make the selected text italic', execCmd: 'italic' },
								{ name: 'Underline', iconClass: 'underline', description:'underline the selected text', execCmd: 'underline' }
							]
						},
						{
							buttons: [
								{ name: 'Bulletted List', iconClass: 'list', description:'add a bulletted list', execCmd: 'ul' },
								{ name: 'Numbered List', iconClass: 'orderedlist', description:'add a numbered list', execCmd: 'ol' },
								{ name: 'Paragraph', iconClass: 'paragraph', description:'add a paragraph', execCmd: 'paragraph' }
							]
						}
					]
				},
				{
					last : false, first: false,
					rows: [
						{
							buttons: [
								{ name: 'AlignLeft', iconClass: 'align-left', description:'Align the text left', execCmd: 'align', args: ['left'] },
								{ name: 'AlignCenter', iconClass: 'align-center', description:'Align the text center', execCmd: 'align', args: ['center'] },
								{ name: 'AlignRight', iconClass: 'align-right', description:'Align the text right', execCmd: 'align', args: ['right'] }
							]
						},
						{
							buttons: [
								{ name: 'Heading', iconClass: 'heading', description:'select a heading number from below', 
									buttons: [ 
										{ name: 'H1', text: '1', execCmd: 'heading', description:'make the selected text a heading 1', args: [1] },
										{ name: 'H2', text: '2', execCmd: 'heading', description:'make the selected text a heading 2', args: [2] },
										{ name: 'H3', text: '3', execCmd: 'heading', description:'make the selected text a heading 3', args: [3] },
										{ name: 'H4', text: '4', execCmd: 'heading', description:'make the selected text a heading 4', args: [4] },
										{ name: 'H5', text: '5', execCmd: 'heading', description:'make the selected text a heading 5', args: [5] }
									] 
								},
								{ name: 'Superscript', iconClass: 'superscript', description:'make the selected text superscript', execCmd: 'superscript' },
								{ name: 'Subscript', iconClass: 'subscript', description:'make the selected text subscript', execCmd: 'subscript' }
							]
						}
					]
				},
				{
					last : false, first: false,
					rows: [
						{
							buttons: [
								{ name: 'HyperLink', iconClass: 'link', description:'insert a link', execCmd: ko.contenteditable.actions.createHyperlinkModal },
								{ name: 'Code', iconClass: 'code', description:'insert a code block', execCmd: ko.contenteditable.actions.createCodeModal },
								{ name: 'Html', iconClass: 'html', description:'view/edit the html', execCmd: ko.contenteditable.actions.viewHtmlModal }
								
							]
						},
						{
							buttons: [
								{ name: 'Blockquote', iconClass: 'blockquote', description:'add a blockquote (does not work in IE)', execCmd: 'blockquote' },
								{ name: 'Image', iconClass: 'image', description:'insert an image', execCmd: ko.contenteditable.actions.createImageModal }
							]
						}
					]
				}
			]
		},
		settings: function (configuration) {
			this.position = ko.observable('0,0');
			this.groups = ko.editable.defaults.groups;
			this.cssClass = 'editable';
			this.modalCssClass = configuration.modalCssClass;
			this.handler = configuration.handler;
			this.onInitialized = configuration.onInitialized;
			this.rendered = false;
			
			this.imagePickerHandler = configuration.imagePickerHandler;
		}
	};
	
	ko.addTemplateSafe("htmlEditorTemplate", "\
			<div class=\"ui-htmleditor\">\
				<div class=\"html-view\">\
					<textarea data-bind=\"value: html\"></textarea>\
				</div>\
				<div class=\"html-details\">\
					<button class=\"ui-button bottom\" title=\"Click here to update the html\" type=\"submit\" data-bind=\"click: insert\">Insert</button>\
				</div>\
			</div>", templateEngine);
	
	ko.addTemplateSafe("linkEditorTemplate", "\
			<div class=\"ui-linkdialog\">\
				<div class=\"link-details\">\
					<div class=\"ui-field\">\
						<label for=\"href\">Url</label>\
						<input id=\"href\" type=\"text\" class=\"long\" data-bind=\"value: href\" />\
					</div>\
					<div class=\"ui-field inline\">\
						<label for=\"linkTitle\">Title/Tooltip</label>\
						<input id=\"linkTitle\" type=\"text\" class=\"medium\" data-bind=\"value: title, enable: linkEntered\" />\
					</div>\
					<div class=\"ui-field inline\">\
						<label for=\"blankTarget\" class=\"checkbox\" data-bind=\"click: function() { return true; }, clickBubble: false\"><input id=\"blankTarget\" type=\"checkbox\" data-bind=\"checked: blankTarget, enable: linkEntered\" /> open in a new tab</label>\
					</div>\
					<button class=\"ui-button bottom\" title=\"Click here to insert the link\" type=\"submit\" data-bind=\"click: insert, enable: linkEntered\">Insert</button>\
				</div>\
			</div>", templateEngine);
	
	ko.addTemplateSafe("codeEditorTemplate", "\
			<div class=\"ui-codeeditor\">\
				<textarea id=\"mycode\"></textarea>\
				<div class=\"code-details\">\
					<div class=\"ui-field\">\
						<label for=\"imageSrc\">Chosen Language</label>\
						<select data-bind=\"options: languages, optionsText: 'name', optionsValue: 'name', value: selectedLanguageName\"></select>\
					</div>\
					<button class=\"ui-button bottom\" title=\"Click here to insert the code\" type=\"submit\" data-bind=\"click: insert\">Save</button>\
				</div>\
			</div>", templateEngine);
	
	ko.addTemplateSafe("thumbTemplate", "\
			<div class=\"ui-thumb\" data-bind=\"hover: 'hover', css: { selected: isSelected }, click: select\">\
				<div class=\"thumb-inner\" data-bind=\"style: { width: width + 'px', height: height + 'px' }\">\
					<div class=\"thumb-frame\" data-bind=\"style: { width: frameWidth() + 'px', height: frameHeight() + 'px' }\">\
						<img src=\"${ src }\" alt=\"${ altText }\" title=\"${ title }\" data-bind=\"attr: { width: imageResizedWidth(), height: imageResizedHeight() }\"/>\
					</div>\
				</div>\
			</div>", templateEngine);
	
	ko.addTemplateSafe("imagePickerTemplate", "\
			<div class=\"ui-imagepicker\">\
				<div class=\"image-list\" data-bind=\"css: { loading: isLoading }\">\
					<div class=\"loading-icon\"></div>\
					<div class=\"image-panel\" data-bind=\"template: { name: 'thumbTemplate', foreach: thumbs }\"></div>\
				</div>\
				<div class=\"image-details\">\
					<div class=\"ui-field\">\
						<label for=\"imageSrc\">Image Url</label>\
						<input id=\"imageSrc\" type=\"text\" class=\"long\" data-bind=\"value: src\" />\
					</div>\
					<div class=\"ui-field inline\">\
						<label for=\"imageAltText\">Alt Text</label>\
						<input id=\"imageAltText\" type=\"text\" class=\"medium\" data-bind=\"value: altText, enable: imageSrc\" />\
					</div>\
					<div class=\"ui-field inline\">\
						<label for=\"imageTitle\">Title/Tooltip</label>\
						<input id=\"imageTitle\" type=\"text\" class=\"medium\" data-bind=\"value: title, enable: imageSrc\" />\
					</div>\
					<button class=\"ui-button bottom\" title=\"Click here to insert the image\" type=\"submit\" data-bind=\"click: insert, enable: imageSrc\">Insert</button>\
				</div>\
			</div>", templateEngine);
			
	ko.addTemplateSafe("modalTemplate", "\
			<div class=\"ui-modal-shroud ${ contents.modalCssClass }\" data-bind='click: close, clickBubble: false'></div>\
			<div class=\"ui-modal ${ contents.modalCssClass } ${cssClass}\" data-bind=\"click: function() {}, clickBubble: false, style : { height: (height()- 42) + 'px', width: (width() - 12) + 'px', marginLeft: -(width() / 2)  + 'px', marginTop: -(height() / 2)  + 'px'  }\">\
				<div class=\"inner-window\" data-bind=\"style : { width: (width() - 4) + 'px', height : (height() - 4) + 'px' }\">\
					<div class=\"title-bar\">\
						<div class=\"title-button red right left\" title=\"click here to close\" data-bind='click: close'><div class=\"title-button-inner\"><div class=\"icon close\"></div></div></div>\
					</div>\
				</div>\
				<div class=\"outer-content\">\
					<div class=\"inner-content\" data-bind=\"style : { height: (height() - 45) + 'px' }, template: { name: contents.template, data: contents, afterRender: contents.afterRender }\">\
					</div>\
				</div>\
			</div>", templateEngine);
	
	ko.addTemplateSafe("emptyTemplate", "<p></p>", templateEngine);
	
	ko.addTemplateSafe("buttonTemplate", "\
		<li class=\"button\" title=\"${description}\" data-bind='hover : \"hover\"'>\
			{{if hasSubMenu}}\
				<button class=\"button-inner\">\
					<div class=\"icon ${iconClass}\">${ titleText }</div>\
				</button>\
				<div class=\"menu-container\">\
					<ul class=\"menu\">\
						{{each(index, button) buttons}}\
							<li data-bind='hover : \"hover\"' title=\"${button.description}\" data-bind=\"click: function() { return false; }, clickBubble: false\">\
								<button class=\"button-inner\" data-bind=\"click: runCommand, clickBubble: false\">\
									<div class=\"icon ${button.iconClass}\">${ button.titleText }</div>\
								</button>\
							</li>\
						{{/each}}\
					</ul>\
				</div>\
			{{else}}\
				<button class=\"button-inner\" data-bind=\"click: runCommand, clickBubble: false\" tabindex=\"-1\">\
					<div class=\"icon ${iconClass}\">${ titleText }</div>\
				</button>\
			{{/if}}\
		</li>", templateEngine);
	
	ko.addTemplateSafe("rowTemplate", "\
		<ul class=\"buttons-inner\" data-bind='template: { name: \"buttonTemplate\", foreach: buttons }'></ul>", templateEngine);
	
	ko.addTemplateSafe("groupTemplate", "\
			<div class=\"group\" data-bind='css : { first: first, last: last },template: { name: \"rowTemplate\", foreach: rows }'></div>", templateEngine);
	
	ko.addTemplateSafe("editorTemplate", "\
			<div id=\"ko-editor\" class=\"ep-editor\" data-bind=\"visible : isVisible, editorPosition : area, click: keepFocus, clickBubble: false\">\
				<div class=\"inner\">\
					<div class=\"content\">\
						<div class=\"buttons\" data-bind='template: { name: \"groupTemplate\", foreach: groups }'></div>\
						<div class=\"move sidebar\" title=\"click and hold to move\"></div>\
					</div>\
				</div>\
			</div>", templateEngine);
			
	function displayOutput(target, output) {
		$(target).val(output);
	}

	function logger (log) {
		if (ko.editable.defaults.debug !== undefined && ko.editable.defaults.debug) {
			$('<div></div>').appendTo('#log').text(new Date().toGMTString() + ' : ' + log);
		}
	};
	
	ko.bindingHandlers.editable = {
		'init': function (element, valueAccessor, allBindingsAccessor, viewModel) {
			// initialize rangy
			if (rangy && !rangy.initialized) {
				rangy.init();
			}
		
			var $element = $(element),
				settings = ko.utils.unwrapObservable(valueAccessor()),
				output = allBindingsAccessor()['output'], area, instance, container;

			if (!settings.rendered) {
				instance = settings.editor = new Editor(settings);
				container = $('<div></div>').appendTo('body');	
				ko.renderTemplate("editorTemplate", settings.editor, { templateEngine: templateEngine }, container, "replaceNode");
				// deactivate on body click
				$('body').click(function() {
					if (instance.isVisible()) {
						instance.deactivate();			
					}
				});
				
				settings.rendered = true;
			} else {
				instance = settings.editor;
			}
				
			// make editable
			$element.click(function() { return false; });
			$element.attr('contenteditable', true);
			try {
                document.execCommand("styleWithCSS", 0, false);
            } catch (e) {
                try {
                    document.execCommand("useCSS", 0, true);
                } catch (e) {
                    try {
                        document.execCommand('styleWithCSS', false, false);
                    }
                    catch (e) {
                    }
                }
            }
			if (settings.onInitialized) {
				settings.onInitialized($element);
			}
			//document.execCommand('insertbronreturn', false, false);			
			
			area = new Area($element, instance);
			
			if (output && typeof output == 'function') {
				$element.bind('contents-changed', function() {
					output(area.html());
				});
				$element.trigger('contents-changed');
			}
		}
	};
	
	ko.bindingHandlers.editorPosition = {
		'init': function (element, valueAccessor, allBindingsAccessor, viewModel) {
			var $element = $(element),
				dragOptions = {
					addClasses: false,
					handle : '.move',
					scroll: false,
					stop : function (e, ui) { 
						viewModel.position(ui.offset.left + ',' + ui.offset.top);
					}
				};
			// bind events
			$element.draggable(dragOptions);
			//$element.css('position', 'absolute');
		},
		'update': function (element, valueAccessor, allBindingsAccessor, viewModel) {
			if (viewModel.isVisible() && viewModel.area() !== undefined && !viewModel.isPositioned()) {
				$element = $(element), relative = viewModel.relativeTo() === undefined ? viewModel.area().dom() : $(viewModel.relativeTo());
				relative = relative.get(0).nodeType == 3 ? relative.parent() : relative;
				$element.position({ my: 'right bottom', at: 'right top', of: relative, offset: '0 -5' });
				// record position
				var offset = $element.offset();
				viewModel.position(offset.left + ',' + offset.top);
				viewModel.isPositioned(true);
			}			
		}
	};
})();
