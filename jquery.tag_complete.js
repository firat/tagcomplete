if (window['console'] === undefined) {
	window.console = {log: function(){}, warn: function(){}, error: function(){}, info: function(){}};
}

(function($){
	$.fn.tagComplete = function(options) {
		var timeout, container, autocomplete_el, wrapper, input_element, selection_list, selected_item, last_ajax_output;
		var opts = $.extend({}, $.fn.tagComplete.defaults, options);
		return this.each(function(){
			wrapper = $(this);
			createAndSetupElements();
		});
		
		function createAndSetupElements() {
			createContainer();
			createInputElement();
			// Tags are inserted before the input_element, so it must be created before createTag().
			createTags();
			createAutoCompleteElement();
			locateAutoCompleteElement();

			/* Events */
			// Prevent the from submission by enter
			input_element.keypress(function(ev){
				if (ev.which == 13) {
					ev.preventDefault();
				}
			})
			
			// Handle the keypress events
			input_element.keyup(function(ev){
				handleInputEvent(ev);
				});

			// Hide autocompletediv on blur
/*
			input_element.blur(function(ev){
				finalizeInput(ev);
			})*/
			selected_item = -1;
		}
	
		function createContainer() {
			container = $(document.createElement('div'));
			container.css({
				'overflow' : 'hidden',
				'border' : '1px solid #ccc',
				'margin' : '0px',
				'padding' : '0px',
				'width' : $.fn.tagComplete.constants.width ,
				'cursor' : 'text'
				});
			container.attr('id', wrapper.attr('id') + '_container');
			container.click(function(){
				input_element.focus();
			})
			wrapper.append(container);
		}
		
		function createTags() {
				$(opts.selected).each(function(key, data) {
					insertTag(createTagElement(data.id, data.value));
				});
		}
		
		function insertTag(tag_element) {
			if (opts.single_selection) {
				container.children().filter("div.tag_complete_tag").remove();
			}
			return tag_element.insertBefore(input_element);
		}
		
		function createTagElement(id, value) {
			elem = $(document.createElement('div'));
			elem.attr({
				'value' : id,
				'class' : 'tag_complete_tag',
			});

			text_div = $(document.createElement('div'));
			text_div.css({
				'float' : 'left'
			});
			text_div.html((opts.bodyHandler)(id, value, text_div, false));
			
			// close button container in the tag
			close_button_div = $(document.createElement('div'));
			close_button_div.css({
				'height' : '7px',
				'width' : '7px',
				'overflow' : 'hidden',
				'float' : 'left',
				'margin' : '4px 0 0 4px',
				'cursor' : 'pointer',
			});

			// the close button
			close_button = $(document.createElement('img'));
			close_button.attr('src', '/site_media/images/close.gif');
			close_button.click(function(ev) {
				$(ev.target).parent().parent().remove();
				ev.stopPropagation();

			})
			elem.append(text_div).append(close_button_div.append(close_button));
			return elem;
		}
		
		function createInputElement() {
			input_element = $(document.createElement('input'));
			input_element.attr({
				'type' : 'text',
				'value' : '',
				'id' : wrapper.attr('id') + '_input',
				'autocomplete' : 'off'
			});
			input_element.css({
				'margin' : '3px 5px',
				'padding' : '0',
				'border' : '0',
				'height' : '100%',
				'width' : 'auto'
			});
			
			container.append(input_element);
			input_element.parents().filter("form").submit(function(ev){
				$(container.children().filter("." + opts.name + "_selection_item")).remove();
				input_element.siblings().filter("div").each(function(k, el){
					container.append($(document.createElement('input')).attr({
						'class' : opts.name + "_selection_item",
						'value' : $(el).attr('value'),
						'type' : 'hidden',
						'name' : opts.name
					}))
				})

			});
			
			dummy_input_element = $(document.createElement('input')).attr({
				'type' : 'hidden',
				'id' : 'id_' + opts.name,
			})
			container.append(dummy_input_element)

			dummy_input_element.change(function(ev){
				el = $(ev.target);
				id = el.val();
				el.val("");
				value = el.attr("label");
				el.attr("label" , "");
				insertTag(createTagElement(id, value));
			})
		}
		
		function createAutoCompleteElement() {
			autocomplete_el = $(document.createElement('div'));
			autocomplete_el.css({
				'display' : 'none',
				'padding' : '0',
				'margin' : '0',
				'background' : '#FFFFFF',
				'position' : 'absolute',
				'overflow' : 'auto'
			})
			/*
			if ($.browser == 'msie') {
				autocomplete_el.css('height', '150px');
			} else {
				autocomplete_el.css('max-height', '165px');
			}
			*/
			wrapper.append(autocomplete_el);
		}
		
		function locateAutoCompleteElement() {
			autocomplete_el.css({
				'position' : 'absolute',
				'left' : container.position().left + 'px',
				'top' : container.position().right + container.height() + 'px',
				'width' : container.outerWidth() + 'px'
			})
		}
		
		function handleInputEvent(ev) {
			ev.preventDefault();
			switch(ev.which) {
				case 27:
					cancelInput(ev);
					autocomplete_el.hide();
					break;
				case 13:
					finalizeInput(ev);
					break;
				case 38:
				case 40:
					if (ev.which == 38) { selectPrev(); }
					else if (autocomplete_el.is(":hidden")) { autocomplete_el.show(); }
					else { selectNext(); }
					break;
				default:
						if (timeout != undefined) {
							window.clearTimeout(timeout);
						}
					
						if (ev.target.value.length < opts.requiredLength) {
							if (timeout != undefined) window.clearTimeout(timeout);
							autocomplete_el.html("");
						}

						if (ev.target.value.length > opts.requiredLength - 1) {
							timeout = window.setTimeout(function(ev) {
								initAjaxCall();
							}, 1 * 700, ev);
						}	
			}
		}
		
		function cancelInput(ev) {
			autocomplete_el.hide();
			input_element.attr('value', '');
		}
		
		function finalizeInput(ev) {
			finishSelection();
		}
		
		function initAjaxCall() {
			$.post(opts.location, {'image' : opts.image, 'tag' : input_element.val(), 'starts_with' : opts.starts_with}, function(data, textStats){
				locateAutoCompleteElement();
				autocomplete_el.html("");
				selection_list = $(document.createElement('ul'));
				selection_list.css({
					'list-style-type' : 'none',
					'margin' : '0',
					'padding' : '0',
					'background' : opts.nonselected_bg,
					'color' : opts.nonselected_fg			
				})
				last_ajax_output = data;
				$.each(data, function(d, v) {
					list_element = $(document.createElement('li'))
					list_element.html((opts.bodyHandler)(v.id, v.value, list_element, true)).addClass('tag_complete_selection_item');
					list_element.click(function(e){
						e.preventDefault();
						selectItem(d);
						finishSelection();
					})
					selection_list.append(list_element);
				});
				autocomplete_el.append(selection_list);
				selected_item = 0;
				markAsSelected(selected_item);
				autocomplete_el.show();
			}, "json");
			
		}
		
		function selectPrev() {
			if (selected_item <= 0) return;
			markAsNotSelected(selected_item);
			selected_item = selected_item - 1;
			markAsSelected(selected_item);
		}
		
		function selectNext() {
			if (!selection_list) return;
			if (selected_item >= selection_list.children().length - 1) return;
			markAsNotSelected(selected_item);
			selected_item = selected_item + 1;
			markAsSelected(selected_item);
		}
		
		function markAsSelected(i) {
			$(selection_list.children()[i]).css('background', opts.selected_bg);
			$(selection_list.children()[i]).css('color', opts.selected_fg);
		}
		
		function markAsNotSelected(i) {
			$(selection_list.children()[i]).css('background', opts.nonselected_bg);
			$(selection_list.children()[i]).css('color', opts.nonselected_fg);
		}
		
		function selectItem(i) {
			markAsNotSelected(selected_item);
			selected_item = i;
			markAsSelected(selected_item);
		}
		
		function selectNone() {
			markAsNotSelected(selected_item);
			selected_item = -1;
		}
		
		function finishSelection() {
			if (selected_item == -1) { autocomplete_el.hide(); return; }
			if (container.children().filter("div[value='" + last_ajax_output[selected_item].id + "']").length > 0) { cancelInput(); return; }
			autocomplete_el.hide();
			insertTag(createTagElement(last_ajax_output[selected_item].id, last_ajax_output[selected_item].value));
				
			selectNone();
			input_element.val('');
			input_element.focus();
		}
	};
	
	function defaultBodyHandler(id, label, wrapper) {
		return label;
	}
	
	
	$.fn.tagComplete.constants = {
		width: 350
	}
	
	$.fn.tagComplete.defaults = {
		location: "/",
		selected: [],
		selected_bg : '#006',
		selected_fg : '#fff',
		nonselected_bg : '#fff',
		nonselected_fg : '#000',
		name: 'tag_complete_field',
		single_selection : false,
		starts_with : false,
		image : false,
		bodyHandler : defaultBodyHandler,
		requiredLength : 3
	};
	
	function createStyle() {
		style = $(document.createElement("style"));	
		style.append(".tag_complete_wrapper {\n");
		style.append("color: #FFFFFF;\n")
		style.append("overflow: hidden; float: left; margin-right: 10px; width: " + ($.fn.tagComplete.constants.width + 2) + "px; \n;");
		style.append("}\n");
		
		style.append(".tag_complete_wrapper a{\n");
		style.append("color: #FFFFFF")
		style.append("}\n");
		
		style.append(".tag_complete_wrapper input:focus {\n");
		style.append("outline: none;\n");
		style.append("}\n");
		
		style.append(".tag_complete_tag {\n");
		style.append("overflow: hidden;");
		style.append("background: #417690;\n");
		style.append("color: #FFFFFF;\n");
		style.append("float: left;\n");
		style.append("margin: 3px 5px;\n");
		style.append("padding: 1px 3px;\n");
		style.append("}\n");
		
		style.append(".tag_complete_selection_item { list-style-type: none;\n");
		style.append("margin: 0; padding: 2px 0 5px 2px; border-width: 0 1px 1px 1px;\n");
		style.append("border-color: #ccc; border-style: solid; heght: 20px;\n");
		style.append("cursor: pointer; }\n");
		
		$('head').append(style);
	}
	
	createStyle();
})(jQuery)
