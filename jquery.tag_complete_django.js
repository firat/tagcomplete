$(document).ready(function(){
	dismissAddAnotherPopup = function(win, newId, newRepr) {
		// newId and newRepr are expected to have previously been escaped by                                                
		// django.utils.html.escape.                                                                                        
	    newId = html_unescape(newId);
	    newRepr = html_unescape(newRepr);
	    var name = windowname_to_id(win.name);
	    var elem = document.getElementById(name)
	    if (elem) {
	        if (elem.nodeName == 'SELECT') {
	            var o = new Option(newRepr, newId);
	            elem.options[elem.options.length] = o;
	            o.selected = true;
	        } else if (elem.nodeName == 'INPUT') {
				el = $(elem);
				if (el.attr("type") == 'hidden') {
					el.val(newId);
					el.attr('label', newRepr);
					el.change();
				} else elem.value = newId;
	        }
	    } else {
	        var toId = name + "_to";
	        elem = document.getElementById(toId);
	        var o = new Option(newRepr, newId);
	        SelectBox.add_to_cache(toId, o);
	        SelectBox.redisplay(toId);
	    }
	    win.close();
	}
})