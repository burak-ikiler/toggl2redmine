# frozen_string_literal: true

module Toggl2Redmine
  # View hooks.
  class Hooks < Redmine::Hook::ViewListener
    render_on :view_my_account, partial: 'toggl2redmine/my_account'
  end
end
