# frozen_string_literal: true

module Toggl2Redmine
  module Patches
    # Patch Redmine's TimeEntry model.
    module TimeEntryPatch
      def self.included(base)
        base.class_eval do
          has_many :toggl_mappings, dependent: :destroy
        end
      end
    end
  end
end
