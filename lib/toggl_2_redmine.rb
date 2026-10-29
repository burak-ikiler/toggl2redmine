# frozen_string_literal: true

module Toggl2Redmine
  VERSION = '6.1.1'

  def self.root
    File.dirname(File.dirname(__FILE__))
  end

  # Whether Toggl 2.0 support is turned on in the plugin settings.
  def self.toggl2_enabled?
    settings = Setting.plugin_toggl2redmine
    settings.is_a?(Hash) && settings['toggl2_enabled'].to_s == '1'
  end
end
