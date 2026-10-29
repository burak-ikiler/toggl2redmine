# frozen_string_literal: true

# Redmine runs this file inside a to_prepare block and the plugin's lib
# directory is managed by Zeitwerk, so constants are autoloaded.
Redmine::Plugin.register :toggl2redmine do
  # Package info.
  name 'Toggl 2 Redmine'
  author 'Jigarius'
  description 'Imports time entries from Toggl into Redmine.'
  version Toggl2Redmine::VERSION
  url 'https://github.com/jigarius/toggl2redmine'
  author_url 'https://jigarius.com/'
  requires_redmine version_or_higher: '6.0.0'

  settings default: { 'toggl2_enabled' => '0' },
           partial: 'settings/toggl2redmine'

  # Menu items.
  menu :application_menu,
       :toggl2redmine,
       { controller: 't2r_import', action: 'index' },
       caption: 'Toggl'
end

# Patches.
unless TimeEntry.included_modules.include?(Toggl2Redmine::Patches::TimeEntryPatch)
  TimeEntry.include Toggl2Redmine::Patches::TimeEntryPatch
end

unless UserPreference.included_modules.include?(Toggl2Redmine::Patches::UserPreferencePatch)
  UserPreference.include Toggl2Redmine::Patches::UserPreferencePatch
end

# Hooks register themselves when the class is loaded.
Toggl2Redmine::Hooks
