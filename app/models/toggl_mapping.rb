# frozen_string_literal: true

# A mapping between a TogglTimeEntry and a Redmine TimeEntry.
class TogglMapping < ApplicationRecord
  SOURCES = %w[track toggl2].freeze

  attr_readonly :id

  belongs_to :time_entry

  validates :time_entry, presence: true
  validates :toggl_id,
            presence: true,
            numericality: {
              only_integer: true,
              greater_than: 0
            },
            uniqueness: { scope: :source, message: 'has already been imported' }
  validates :source, inclusion: { in: SOURCES }
end
