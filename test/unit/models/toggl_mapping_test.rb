# frozen_string_literal: true

require_relative '../../test_helper'

class TogglMappingTest < T2r::TestCase
  fixtures :all

  test 'simple attribute readers' do
    subject = TogglMapping.new(
      toggl_id: 19,
      time_entry_id: 89,
      created_at: DateTime.strptime('2021-01-16T15:30:04+00:00')
    )

    assert_equal(19, subject.toggl_id)
    assert_equal(89, subject.time_entry_id)
    assert_equal(DateTime.strptime('2021-01-16T15:30:04+00:00'), subject.created_at)
  end

  test 'source defaults to track' do
    assert_equal('track', TogglMapping.new.source)
  end

  test 'the same Toggl ID can be imported once per source' do
    time_entry = TimeEntry.first

    TogglMapping.create!(time_entry: time_entry, toggl_id: 777_001, source: 'track')
    assert TogglMapping.new(time_entry: time_entry, toggl_id: 777_001, source: 'toggl2').valid?

    duplicate = TogglMapping.new(time_entry: time_entry, toggl_id: 777_001, source: 'track')
    refute duplicate.valid?
    assert_includes(duplicate.errors[:toggl_id], 'has already been imported')
  end

  test 'source must be known' do
    subject = TogglMapping.new(source: 'other')
    refute subject.valid?
    assert subject.errors[:source].any?
  end
end
