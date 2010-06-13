/*
---
name : Suggestion
description : Dynamically create CodeCompletion lists for use with TextMate and Thomas Aylott's (SubtleGradient) `complete.rb`
version: 0.1

authors   : Thomas Aylott
copyright : © 2010 Thomas Aylott
license   : MIT

provides :
- Suggestion
- Suggestion.Method
- Suggestion.Property

requires :
- JSON
- Object.create
- Snippet
...
*/

if (typeof require !== 'undefined'){
	try {
		var Snippet = require('Snippet').Snippet;
		require('global-es5');
	} catch(e){}
}

Suggestion.completions = {
	
	extra_chars: "\._$",
	images: {
		Namespace:'Namespace.png',
		Method:'Method.png',
		Property:'Property.png'
	},
	tool_tip_prefix: "",
	suggestions:[]
	
};

function Suggestion(options){
	if (!(this instanceof Suggestion)) return new Suggestion(options);
	
	if (options) for (var property in options){
		if (!hasOwnProperty.call(options, property)) continue;
		if (typeof options[property] === 'undefined') continue;
		this[property] = options[property];
	}
	
	this.insert = (new Snippet()).appendRaw(this.insert);
}
Suggestion.prototype = {
	tool_tip_format : "html",
	tool_tip        : "",
	insert          : "$0", // new Snippet()
	match           : "suggestion",
	display         : "My suggestion of Doom!",
	image           : "",
	
	toJSON: function(){
		return {
			tool_tip_format : "" + this.tool_tip_format ,
			tool_tip        : "" + this.tool_tip        ,
			insert          : "" + this.insert          ,
			match           : "" + this.match           ,
			display         : "" + this.display         ,
			image           : "" + this.image           
		};
	}
};


Suggestion.Method = function(options){
	if (!(this instanceof Suggestion.Method)) return new Suggestion.Method(options);
	Suggestion.call(this, options);
	this.params = [];
};
Suggestion.Method.prototype = Object.create(Suggestion.prototype);
Suggestion.Method.prototype.image = "Method";
Suggestion.Method.prototype.insert = "($0)";
Suggestion.Method.prototype.updateToolTip = function(){
	tip = '';
	
	tip += this.description.replace(/^\s*(<p>)?/,'<p>');

	tip += '<p><code class="usage">';
	tip += '<b><u>';
	tip += this.display.replace(/\t/g,'').replace(/\:|$/,'</u></b><i>:');
	tip += "</i><br>(\n";
	
	var objectKey;
	var objectProperties;
	
	if (this.params && this.params.length)
	for (var i = -1, param; param = this.params[++i];){
		
		if (param.description) if (objectKey = param.description.match(/properties defined in .*?>([^<]*)</)){
			objectKey = objectKey[1];
			objectProperties = this.API[objectKey].properties;
			// sys.p(objectKey, objectProperties);
			
			tip += "{\n"
			for (var p = -1; p < objectProperties.length; ++p){
				if (!objectProperties[p]) continue;
				tip += describeProperty(objectProperties[p]);
			}
			tip += "}\n"
			continue;
		}
		
		tip	+= "\t";
		tip += describeProperty(param);
	}
	tip += ")\n"
	tip += '</code>'
	
	// sys.print(tip.replace(/</g,'&lt;'));
	
	this.tool_tip = tip;
};

function describeProperty(p){
	var html	=	"\t"
		+	"<span>"
			+	"<b>"
				+	p.name
			+	"</b>"
			+	"<i>"
				+	":"
				+	p.type
			+	"</i>"
		+	"</span>"
		+	"\n\t\t"
		+	"<span class='info'>"
			+	(p.description || p.value).replace(/<[^>]*>/,'')
		+	"</span>"
		+	"\n"
	;
	return html;
}


Suggestion.Method.prototype.updateInsertSnippet = function(){
	snip = new Snippet('');
	var add;
	if (this.params && this.params.length){
		for (var i = -1, param; param = this.params[++i];){
			if (i == 0) snip.appendText("(").begin();
			else snip.appendText(", ");
			
			var isLast = !this.params[i+1];
			add = (isLast ? 'addLast' : 'addPlaceholder');
			
			switch (param.type){
			case 'string': snip.appendText("'")[add](param.name).appendText("'"); break;
			case 'object': snip.appendText("{")[add]().appendText("}"); break;
			case 'function': snip.appendText("function ").addPlaceholder(param.name).appendText("(").addPlaceholder().appendText(")").appendText("{")[add]().appendText("}"); break;
			default:
				snip.addPlaceholder(param.name);
			}
		}
		snip.end().appendText(')');
	}
	else snip.appendRaw('($0)');
	
	// sys.p(snip)
	
	this.insert = snip;
};
Suggestion.Method.prototype.addParams = function(params){
	if (!(params && params.length)) return this;
	for (var i = -1, param; param = params[++i];){
		this.addParam(param, false);
	}
	this.updateToolTip();
	this.updateInsertSnippet();
	return this;
};
Suggestion.Method.prototype.addParam = function(param, shouldUpdate){
	this.params.push(param);
	if (shouldUpdate !== false) this.updateToolTip().updateInsertSnippet();
	return this;
};


Suggestion.Property = function(options){
	if (!(this instanceof Suggestion.Property)) return new Suggestion.Property(options);
	Suggestion.call(this, options);
};
Suggestion.Property.prototype = Object.create(Suggestion.prototype);
Suggestion.Property.prototype.image = "Property";

Suggestion.fromAPI = function(api, namespace, API){
	
	Suggestion.completions.suggestions.push(
		new Suggestion({
			API:API,
			tool_tip : api.description +'<hr />'+ (api.notes || ''),
			match    : namespace,
			display  : '(Namespace)\t' + namespace,
			image    : "Namespace"
		})
		.toJSON()
	);
	
	if (api.methods && api.methods.length)
	api.methods.forEach(function(method){
		// sys.p(method.name, method.returntype, method.parameters.map(function(param){ return param.name+':'+param.type }));
		Suggestion.completions.suggestions.push(
			new Suggestion.Method({
				API:API,
				match   : namespace +'.'+ method.name,
				display : '(Method)\t\t' + namespace +'.'+ method.name + '\t:' + method.returntype + "()",
				description: method.value
			})
			.addParams(method.parameters)
			.toJSON()
		);
	});
	
	if (api.properties && api.properties.length)
	api.properties.forEach(function(property){
		if (!property.name) return;
		
		Suggestion.completions.suggestions.push(
			new Suggestion.Property({
				API:API,
				tool_tip : property.value,
				
				match    : namespace +'.'+ property.name,
				display  : '(Property)\t' + namespace +'.'+ property.name + '\t:' + property.type
			})
			.toJSON()
		);
	});
	
};

if (typeof exports == 'undefined') var exports = {};
exports.Suggestion = Suggestion;

