require './config/initialisers'
require './models/js_error'

class FrontendDashboard < Sinatra::Base
  
  get '/' do
    haml :index, :locals => { :type => '' }
  end

  get '/log' do
    current_page = params[:page] ? params[:page].to_i : 1
    haml :log, :locals => { :errors => JsError.paginate({ :order => :timestamp.desc, :per_page => params[:'per-page'] || 50, :page => current_page }), :type => 'yesterday', :current_page => current_page }
  end

  get '/occurrences' do 
    if (params[:file] || params[:message])
      where_param = (params[:file]) ? 'file' : 'message'
      where_value = params[:file] || params[:message]
      errors = JsError.group_occurrences((params[:file]) ? 'message' : 'file', { :query => { where_param => where_value } })
    elsif (params[:by])
      errors = JsError.group_occurrences(params[:by])
    else
      # default to 'by message'
      errors = JsError.group_occurrences('message')
    end
    haml :occurrences, :locals => { :errors => errors, :type => 'occurrences', :where_param => where_param, :where_value => where_value }
  end

  get '/user-agents' do
    haml :'user_agents', :locals => { :errors => JsError.all, :type => 'user-agents' }, :cdata => true
  end
    
end