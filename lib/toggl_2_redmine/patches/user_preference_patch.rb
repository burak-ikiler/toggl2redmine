# frozen_string_literal: true

module Toggl2Redmine
  module Patches
    # Stores the Toggl 2.0 settings of a user in their preferences.
    module UserPreferencePatch
      TOGGL2_FIELDS = %i[toggl2_api_key toggl2_organization_id toggl2_workspace_id].freeze

      def self.included(base)
        base.class_eval do
          safe_attributes(*TOGGL2_FIELDS.map(&:to_s), if: ->(_pref, _user) { Toggl2Redmine.toggl2_enabled? })

          TOGGL2_FIELDS.each do |field|
            define_method(field) { self[field] }
            define_method(:"#{field}=") { |value| self[field] = value.to_s.strip }
          end
        end
      end
    end
  end
end
