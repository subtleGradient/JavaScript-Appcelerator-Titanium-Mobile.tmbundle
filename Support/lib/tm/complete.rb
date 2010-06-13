#!/usr/bin/env ruby
=begin
---
url : http://gist.github.com/437012
name : complete.rb
description : "Ruby Code Completion framework for TextMate. Supports ENV var, JSON & Plist completion lists & options."

authors   : Thomas Aylott
copyright : © 2008-2010 Thomas Aylott
license   : MIT

provides :
- "TextMate::Complete"
- "TextMate::Complete#complete!"
- "TextMate::Complete#tip!"

requires :
- "TextMate::UI.complete"
- "TextMate::UI.tool_tip"
- "Word.current_word"
- "OSX::PropertyList"
- "JSON.parse"
...
=end
require File.dirname(__FILE__) + "/../current_word"
require ENV['TM_SUPPORT_PATH'] + '/lib/ui'
require ENV['TM_SUPPORT_PATH'] + '/lib/escape'
require ENV['TM_SUPPORT_PATH'] + '/lib/osx/plist'
require 'rubygems'
require 'json'
require 'shellwords'

module TextMate
  class Complete
    IMAGES_FOLDER_NAME = 'icons'
    IMAGES = {
      "C"   => "/Applications/TextMate.app/Contents/Resources/Bundle Item Icons/Commands.png",
      "D"   => "/Applications/TextMate.app/Contents/Resources/Bundle Item Icons/Drag Commands.png",
      "L"   => "/Applications/TextMate.app/Contents/Resources/Bundle Item Icons/Languages.png",
      "M"   => "/Applications/TextMate.app/Contents/Resources/Bundle Item Icons/Macros.png",
      "P"   => "/Applications/TextMate.app/Contents/Resources/Bundle Item Icons/Preferences.png",
      "S"   => "/Applications/TextMate.app/Contents/Resources/Bundle Item Icons/Snippets.png",
      "T"   => "/Applications/TextMate.app/Contents/Resources/Bundle Item Icons/Templates.png",
      "Doc" => "/Applications/TextMate.app/Contents/Resources/Bundle Item Icons/Template Files.png",
    }
    
    def initialize
    end
    
    # 0-config completion command using environment variables for everything
    def complete!
      return choices unless choices
      TextMate::UI.complete(choices, {:images => images, :extra_chars => extra_chars}) do |result|
        TextMate::UI.tool_tip( result['tool_tip'], {:format => result['tool_tip_format'] || :text })
        result ? result['insert'] : nil
      end
    end
    
    def tip!
      # If there is no current_word, then check the next current_word
      #   If there really is no current_word, then show a menu of choices
      
      chars = "a-zA-Z0-9" # Hard-coded into D2
      chars += Regexp.escape(extra_chars) if extra_chars
      current_word ||= Word.current_word chars, :both
      
      result = nil
      menu_choices = nil
      choices      = nil
      choice       = 0
      
      [current_word, current_method_name, current_collection_name].each do |initial_filter|
        next unless initial_filter and not initial_filter.empty?
        # p initial_filter
        
        choices = self.choices.select { |c| (c['match'] || c['display']) =~ /^#{Regexp.quote(initial_filter)}/ }
        
        # p choices
        break if choices and not choices.empty?
      end
      choices ||= self.choices
      
      menu_choices = choices.map { |c| c['display'] }
      choice = TextMate::UI.menu(menu_choices) if menu_choices and menu_choices.length > 1
      if choice
        result = choices[choice]
      end
      result = {'tool_tip' => 'No information'} unless result
      
      TextMate::UI.tool_tip( result['tool_tip'], {:format => result['tool_tip_format'] || :text })
    end
    
    def choices
      @choices ||= data['suggestions']
    end
    def choices= choice_array
      @choices = array_to_suggestions(choice_array)
    end
    
    def images
      @images = data['images'] || IMAGES
      
      data['images']||{}.each_pair do |name,path|
        @images[name] = path
        next if File.exists? @images[name]
        @images[name] = ENV['TM_BUNDLE_SUPPORT'] + "/#{IMAGES_FOLDER_NAME}/" + path
        next if File.exists? @images[name]
        @images[name] = ENV['TM_SUPPORT_PATH']   + "/#{IMAGES_FOLDER_NAME}/" + path
        next if File.exists? @images[name]
      end
      
      @images
    end
    
    def tool_tip_prefix
      @tool_tip_prefix ||= data['tool_tip_prefix']
    end
    
    def extra_chars
      ENV['TM_COMPLETIONS_EXTRACHARS'] || data['extra_chars']
    end
    
    def chars
      "a-zA-Z0-9"
    end
    
    private
    def data(raw_data=nil)
      fix_legacy
      
      raw_data ||= read_data
      return {} unless raw_data and not raw_data.empty?
      
      @data = parse_data raw_data
      return @data
    end
    
    def read_data
      raw_data = read_file
      raw_data ||= read_string
      raw_data
    end
    
    def read_file
      paths = [ENV['TM_COMPLETIONS_FILE']] if ENV['TM_COMPLETIONS_FILE']
      paths ||= Shellwords.shellwords( ENV['TM_COMPLETIONS_FILES'] ) if ENV.has_key?('TM_COMPLETIONS_FILES')
      return nil unless paths
      
      paths.map do |path|
        next unless path and not path.empty?
        path = ENV['TM_BUNDLE_SUPPORT'] + '/' + path unless File.exists? path
        next unless File.exists? path
        
        { :data   => File.read(path),
          :format => path.scan(/\.([^\.]+)$/).last.last
        }
      end
    end
    
    def read_string
      [{:data   => ENV['TM_COMPLETIONS'],
        :format => ENV['TM_COMPLETIONS_SPLIT']
      }]
    end
    
    attr_accessor :filepath
    
    def parse_data(raw_datas)
      return @parsed if @parsed
      parsed = {"suggestions"=>[]}
      
      raw_datas.each do |raw_data|
        suggestions = parsed['suggestions']
        
        case raw_data[:format]
        when 'plist'
          par = parse_plist(raw_data)
        when 'json'
          par = parse_json(raw_data)
        when "txt"
          raw_data[:format] = "\n"
          par = parse_string(raw_data)
        when nil
          raw_data[:format] = ","
          par = parse_string(raw_data)
        else
          par = parse_string(raw_data)
        end
        
        if par['tool_tip_prefix']
          par['suggestions'] = par['suggestions'].map do |suggestion|
            suggestion['tool_tip'] = par['tool_tip_prefix'] + suggestion['tool_tip']
            suggestion
          end
        end
        
        parsed.merge! par
        parsed['suggestions'] = suggestions + parsed['suggestions']
      end
      
      @parsed = parsed
    end
    def parse_string(raw_data)
      return {} unless raw_data and raw_data[:data]
      return raw_data[:data] unless raw_data[:data].respond_to? :to_str
      raw_data[:data] = raw_data[:data].to_str
      
      data = {}
      data['suggestions'] = array_to_suggestions(raw_data[:data].split(raw_data[:format]))
      data
    end
    def parse_plist(raw_data)
      OSX::PropertyList.load(raw_data[:data])
    end
    def parse_json(raw_data)
      JSON.parse(raw_data[:data])
    end
    
    def array_to_suggestions(suggestions)
      suggestions.delete('')
      
      suggestions.map! do |c|
        {'display' => c}
      end
      
      suggestions
    end
    def current_method_name
      # Regex for finding a method or function name that's close to your caret position using Word.current_word
      # TODO: Allow completion prefs to define their own Complete.tip! method_name
      
      characters = "a-zA-Z0-9" # Hard-coded into D2
      characters += Regexp.escape(extra_chars) if extra_chars
      
      regex = %r/
      (?> [^\(\)]+ | \)   (?> [^\(\)]+ | \)   (?> [^\(\)]+ | \)   (?> [^\(\)]+ | \)   (?> [^\(\)]+ | \)   (?> [^\(\)]* )   \( | )+   \( | )+   \( | )+   \( | )+   \( | )+
      (?: \(([#{characters}]+) )?/ix
      
      Word.current_word(regex,:left)
    end
    def current_collection_name
      characters = "a-zA-Z0-9" # Hard-coded into D2
      characters += Regexp.escape(extra_chars) if extra_chars
      
      regex = %r/
      (?> [^\[\]]+ | \]   (?> [^\[\]]+ | \]   (?> [^\[\]]+ | \]   (?> [^\[\]]+ | \]   (?> [^\[\]]+ | \]   (?> [^\[\]]* )   \[ | )+   \[ | )+   \[ | )+   \[ | )+   \[ | )+
      (?: \[([#{characters}]+) )?/ix
      
      Word.current_word(regex,:left)
    end
    
    def fix_legacy
      ENV['TM_COMPLETIONS_SPLIT'] ||= ENV['TM_COMPLETIONS_split'] 
    end
  end
end

if __FILE__ == $0

`open "txmt://open?url=file://$TM_FILEPATH"` #For testing purposes, make this document the topmost so that the complete popup works
ENV['WEB_PREVIEW_RUBY']='NO-RUN'
require "test/unit"
# require "complete"

class TestComplete < Test::Unit::TestCase
  def setup
    @string_raw = 'ad(),adipisicing,aliqua,aliquip,amet,anim,aute,cillum,commodo,consectetur,consequat,culpa,cupidatat,deserunt,do,dolor,dolore,Duis,ea,eiusmod,elit,enim,esse,est,et,eu,ex,Excepteur,exercitation,fugiat,id,in,incididunt,ipsum,irure,labore,laboris,laborum,Lorem,magna,minim,mollit,nisi,non,nostrud,nulla,occaecat,officia,pariatur,proident,qui,quis,reprehenderit,sed,sint,sit,sunt,tempor,ullamco,Ut,ut,velit,veniam,voluptate,'
    
    @plist_raw = <<-'PLIST'
    { suggestions = ( 
        { display = moo; image = Drag;    insert = "(${1:one}, ${2:one}, ${3:three}${4:, ${5:five}, ${6:six}})";         tool_tip = "moo(one, two, four[, five])\n This method does something or other maybe.\n Insert longer description of it here."; }, 
        { display = foo; image = Macro;   insert = "(${1:one}, \"${2:one}\", ${3:three}${4:, ${5:five}, ${6:six}})";     tool_tip = "foo(one, two)\n This method does something or other maybe.\n Insert longer description of it here."; }, 
        { display = bar; image = Command; insert = "(${1:one}, ${2:one}, \"${3:three}\"${4:, \"${5:five}\", ${6:six}})"; tool_tip = "bar(one, two[, three])\n This method does something or other maybe.\n Insert longer description of it here."; } 
      ); 
      extra_chars = '.';
      images = { 
        Command    = "Commands.png"; 
        Drag       = "Drag Commands.png"; 
        Language   = "Languages.png"; 
        Macro      = "Macros.png"; 
        Preference = "Preferences.png"; 
        Snippet    = "Snippets.png"; 
        Template   = "Template Files.png"; 
        Templates  = "Templates.png"; 
      }; 
    }
    PLIST
    
    @json_raw = <<-'JSON'
    {
    	"extra_chars": "-_$.",
    	"suggestions": [
    		{ "display": ".moo", "image": "", "insert": "(${1:one}, ${2:one}, ${3:three}${4:, ${5:five}, ${6:six}})",         "tool_tip": "moo(one, two, four[, five])\n This method does something or other maybe.\n Insert longer description of it here." },
    		{ "display": "foo",  "image": "", "insert": "(${1:one}, \"${2:one}\", ${3:three}${4:, ${5:five}, ${6:six}})",     "tool_tip": "foo(one, two)\n This method does something or other maybe.\n Insert longer description of it here." },
    		{ "display": "bar",  "image": "", "insert": "(${1:one}, ${2:one}, \"${3:three}\"${4:, \"${5:five}\", ${6:six}})", "tool_tip": "bar(one, two[, three])\n This method does something or other maybe.\n Insert longer description of it here." }
    	],
    	"images": {
    		"String"  : "String.png",
    		"RegExp"  : "RegExp.png",
    		"Number"  : "Number.png",
    		"Array"   : "Array.png",
    		"Function": "Function.png",
    		"Object"  : "Object.png",
    		"Node"    : "Node.png",
    		"NodeList": "NodeList.png"
    	}
    }
    JSON
  end
  
  def test_basic_complete
    ENV['TM_COMPLETIONS'] = @string_raw
    
    assert_equal ENV['TM_COMPLETIONS'].split(','), TextMate::Complete.new.choices.map{|c| c['display']}
    assert_equal TextMate::Complete::IMAGES, TextMate::Complete.new.images
    
    TextMate::Complete.new.complete!
  end
  # 
  def test_should_support_plist
    ENV['TM_COMPLETIONS_SPLIT']='plist'
    ENV['TM_COMPLETIONS'] = @plist_raw
    TextMate::Complete.new.complete!
  end
  # 
  def test_should_support_json
    ENV.delete 'TM_COMPLETIONS'
    assert_nil(ENV['TM_COMPLETIONS'])
    ENV.delete 'TM_COMPLETIONS_SPLIT'
    assert_nil(ENV['TM_COMPLETIONS_SPLIT'])
    
    ENV['TM_COMPLETIONS_SPLIT']='json'
    ENV['TM_COMPLETIONS'] = @json_raw
    fred = TextMate::Complete.new
    assert_equal(3, fred.choices.length)
  end
  # 
  def test_should_be_able_to_modify_the_choices
    ENV['TM_COMPLETIONS'] = @string_raw
    
    fred = TextMate::Complete.new
    
    assert_not_nil fred.choices
    assert_equal ENV['TM_COMPLETIONS'].split(','), fred.choices.map{|c| c['display']}
    fred.choices.reject!{|choice| choice['display'] !~ /^a/ }
    assert_equal ENV['TM_COMPLETIONS'].split(',').grep(/^a/), fred.choices.map{|c| c['display']}
    
    fred.choices=%w[fred is not my name]
    assert_equal %w[fred is not my name], fred.choices.map{|c| c['display']}
  end
  # 
  def test_should_parse_files_based_on_extension_plist
    ENV['TM_COMPLETIONS_FILE'] = '/tmp/completions_test.plist'
    
    File.open(ENV['TM_COMPLETIONS_FILE'],'w'){|file| file.write @plist_raw }
    assert File.exists?(ENV['TM_COMPLETIONS_FILE'])
    
    fred = TextMate::Complete.new
    assert_equal(['moo', 'foo', 'bar'], fred.choices.map{|c| c['display']})
  end
  # 
  def test_should_parse_files_based_on_extension_txt
    ENV.delete 'TM_COMPLETIONS'
    assert_nil(ENV['TM_COMPLETIONS'])
    ENV.delete 'TM_COMPLETIONS_SPLIT'
    assert_nil(ENV['TM_COMPLETIONS_SPLIT'])
    
    ENV['TM_COMPLETIONS_FILE'] = '/tmp/completions_test.txt'
    
    File.open(ENV['TM_COMPLETIONS_FILE'],'w'){|file| file.write @string_raw.gsub(',',"\n") }
    assert File.exists?(ENV['TM_COMPLETIONS_FILE'])
    
    fred = TextMate::Complete.new
    
    assert_equal(@string_raw.split(','), fred.choices.map{|c| c['display']})
  end
  # 
  def test_should_parse_multiple_files
    ENV.delete 'TM_COMPLETIONS'
    assert_nil(ENV['TM_COMPLETIONS'])
    ENV.delete 'TM_COMPLETIONS_SPLIT'
    assert_nil(ENV['TM_COMPLETIONS_SPLIT'])
    ENV.delete 'TM_COMPLETIONS_FILE'
    assert_nil(ENV['TM_COMPLETIONS_FILE'])
    
    ENV['TM_COMPLETIONS_FILES'] = "'/tmp/completions_test.txt' '/tmp/completions_test1.txt' '/tmp/completions_test2.txt'"
    
    require 'shellwords'
    Shellwords.shellwords( ENV['TM_COMPLETIONS_FILES'] ).each_with_index do |filepath,i|
      File.open(filepath,'w'){|file| file.write @string_raw.gsub(',',"#{i}\n") }
      assert File.exists?(filepath)
    end
    
    fred = TextMate::Complete.new
    
    assert_equal(@string_raw.split(',').uniq.length * 3, fred.choices.map{|c| c['display']}.length )
  end
  # 
  def test_should_override_split_with_extension
    ENV['TM_COMPLETIONS_SPLIT'] = ','
    ENV['TM_COMPLETIONS_FILE'] = '/tmp/completions_test.plist'
    
    File.open(ENV['TM_COMPLETIONS_FILE'],'w'){|file| file.write @plist_raw }
    assert File.exists?(ENV['TM_COMPLETIONS_FILE'])
    
    fred = TextMate::Complete.new
    assert_equal(['moo', 'foo', 'bar'], fred.choices.map{|c| c['display']})
  end
  # 
  def test_should_get_extra_chars_from_var
    ENV['TM_COMPLETIONS_SPLIT']=','
    ENV['TM_COMPLETIONS'] = @string_raw
    ENV['TM_COMPLETIONS_EXTRACHARS'] = '.'
    
    fred = TextMate::Complete.new
    assert_equal('.', fred.extra_chars)
  end
  # 
  def test_should_get_extra_chars_from_plist
    ENV['TM_COMPLETIONS_SPLIT']='plist'
    ENV['TM_COMPLETIONS'] = @plist_raw
    
    assert_nil(ENV['TM_COMPLETIONS_EXTRACHARS'])
    
    fred = TextMate::Complete.new
    assert_equal('.', fred.extra_chars)
  end
  # TODO: should_fix_image_paths
# =begin
  def test_should_fix_image_paths
    ENV['TM_COMPLETIONS_SPLIT'] = 'plist'
    ENV['TM_COMPLETIONS']       = @plist_raw
    ENV['TM_BUNDLE_SUPPORT']    = '/tmp'
    ENV['TM_SUPPORT_PATH']      = '/tmp'
    
    images = OSX::PropertyList.load(@plist_raw)['images']
    
    FileUtils.mkdir_p "#{ENV['TM_SUPPORT_PATH']}/#{TextMate::Complete::IMAGES_FOLDER_NAME}"
    images.each_pair do |name,path|
      File.open("#{ENV['TM_SUPPORT_PATH']}/#{TextMate::Complete::IMAGES_FOLDER_NAME}/#{path}", 'w'){ |file| file.write('') }
    end
    
    TextMate::Complete.new.images.each_pair do |name,path|
      p path
      assert File.exists?(path)
    end
    
  end
=begin

=end
  def test_should_apply_prefix
    ENV.delete 'TM_COMPLETIONS'
    assert_nil(ENV['TM_COMPLETIONS'])
    ENV.delete 'TM_COMPLETIONS_SPLIT'
    assert_nil(ENV['TM_COMPLETIONS_SPLIT'])
    
    @json_raw = <<-'JSON'
    {
    	"extra_chars": "-_$.",
    	"tool_tip_prefix":"prefix",
    	"suggestions": [
    		{ "display": ".moo", "image": "", "insert": "(${1:one}, ${2:one}, ${3:three}${4:, ${5:five}, ${6:six}})",         "tool_tip": "moo(one, two, four[, five])\n This method does something or other maybe.\n Insert longer description of it here." },
    		{ "display": "foo",  "image": "", "insert": "(${1:one}, \"${2:one}\", ${3:three}${4:, ${5:five}, ${6:six}})",     "tool_tip": "foo(one, two)\n This method does something or other maybe.\n Insert longer description of it here." },
    		{ "display": "bar",  "image": "", "insert": "(${1:one}, ${2:one}, \"${3:three}\"${4:, \"${5:five}\", ${6:six}})", "tool_tip": "bar(one, two[, three])\n This method does something or other maybe.\n Insert longer description of it here." }
    	],
    	"images": {
    		"String"  : "String.png",
    		"RegExp"  : "RegExp.png",
    		"Number"  : "Number.png",
    		"Array"   : "Array.png",
    		"Function": "Function.png",
    		"Object"  : "Object.png",
    		"Node"    : "Node.png",
    		"NodeList": "NodeList.png"
    	}
    }
    JSON
    
    ENV['TM_COMPLETIONS_SPLIT']='json'
    ENV['TM_COMPLETIONS'] = @json_raw
    fred = TextMate::Complete.new
    assert_equal(3, fred.choices.length)
    assert fred.choices.first['tool_tip'].match(/^prefix/)
  end
  # 
  def test_should_show_tooltip_without_inserting_anything
    # This method passes if it shows a tooltip when selecting a menu-item 
    # and DOESN'T insert anything or cause the document think anything has changed
    ENV.delete 'TM_COMPLETIONS'
    assert_nil(ENV['TM_COMPLETIONS'])
    ENV.delete 'TM_COMPLETIONS_SPLIT'
    assert_nil(ENV['TM_COMPLETIONS_SPLIT'])
    
    ENV['TM_COMPLETIONS_SPLIT']='json'
    ENV['TM_COMPLETIONS'] = @json_raw
    fred = TextMate::Complete.new
    assert_equal(3, fred.choices.length)
    
    TextMate::Complete.new.tip!
  end
  # 
  def test_tip_should_look_for_the_current_word_and_then_try_the_closest_function_name
    ENV.delete 'TM_COMPLETIONS'
    assert_nil(ENV['TM_COMPLETIONS'])
    ENV.delete 'TM_COMPLETIONS_SPLIT'
    assert_nil(ENV['TM_COMPLETIONS_SPLIT'])
    
    ENV['TM_COMPLETIONS_SPLIT']='json'
    ENV['TM_COMPLETIONS'] = @json_raw
    fred = TextMate::Complete.new
    assert_equal(3, fred.choices.length)
    
    TextMate::Complete.new.tip!
    # 
    # This test passes if, when run, you see the tooltip for closest function
    #   Be sure to more your caret around and try a few times
    # Showing a menu is a fail
    # 
    # foo( bar(  ), '.moo' ) 
    #    ^ Caret here should give the tip for 'foo'
    #          ^ Caret here should give the tip for 'bar'
    #                     ^ Caret here should give the tip for 'bar'
    #                ^ Caret here should give the tip for '.moo'
    # foo( bar(one,two,foo), '.moo' ) 
    # foo['bar']
  end
  #
end

end#if
