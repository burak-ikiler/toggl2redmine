# frozen_string_literal: true

# Toggl Track and Toggl 2.0 IDs come from different sequences, so a mapping
# is unique per source.
class AddSourceToTogglMappings < ActiveRecord::Migration[6.1]
  def change
    add_column :toggl_mappings, :source, :string, limit: 16, null: false, default: 'track'
    remove_index :toggl_mappings, column: :toggl_id, unique: true, name: :toggle_id
    add_index :toggl_mappings, %i[source toggl_id], unique: true
  end
end
