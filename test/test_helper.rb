# frozen_string_literal: true

require File.expand_path('../../../test/test_helper', __dir__)

module T2r
  class TestCase < ActiveSupport::TestCase
    # Use the plugin's fixtures instead of the ones inherited from Redmine.
    self.fixture_paths = [
      File.join(Toggl2Redmine.root, 'test', 'fixtures')
    ]
    self.fixture_table_names = []
  end

  class IntegrationTest < Redmine::IntegrationTest
    # Use the plugin's fixtures instead of the ones inherited from Redmine.
    self.fixture_paths = [
      File.join(Toggl2Redmine.root, 'test', 'fixtures')
    ]
    self.fixture_table_names = []

    protected

    def log_user(login, password)
      post signin_url, params: {
        username: login,
        password: password
      }
    end

    def set_custom_field_value(user, field, value)
      assert_not_nil(field, "Unexpected: Field 'Toggl API Token' not found")

      custom_value =
        CustomValue.find_by(customized: user, custom_field: field) ||
        CustomValue.new(customized: user, custom_field: field)

      custom_value.value = value
      custom_value.save!
    end
  end
end
