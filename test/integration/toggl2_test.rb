# frozen_string_literal: true

require_relative '../test_helper'

class Toggl2Test < T2r::IntegrationTest
  fixtures :all

  def setup
    @user = users(:jsmith)
    @field = custom_fields(:toggl_api_token)
    set_custom_field_value(@user, @field, '')
  end

  test 'plugin settings page has the Toggl 2.0 switch' do
    log_user('admin', 'admin')

    get '/settings/plugin/toggl2redmine'

    assert_response :success
    assert_select 'input[type=checkbox][name=?]', 'settings[toggl2_enabled]'
  end

  test 'my account hides Toggl 2.0 fields when disabled' do
    log_user(@user.login, @user.login)

    with_toggl2(false) { get '/my/account' }

    assert_response :success
    assert_select 'input[name=?]', 'pref[toggl2_api_key]', 0
  end

  test 'my account shows and saves Toggl 2.0 fields when enabled' do
    log_user(@user.login, @user.login)

    with_toggl2(true) do
      get '/my/account'

      assert_response :success
      assert_select 'input[name=?]', 'pref[toggl2_api_key]'
      assert_select 'em.info', text: 'Leave empty to keep using Toggl Track.'
      assert_select 'input[name=?]', 'pref[toggl2_organization_id]'
      assert_select 'input[name=?]', 'pref[toggl2_workspace_id]'

      put '/my/account', params: {
        user: { firstname: @user.firstname, lastname: @user.lastname, mail: @user.mail },
        pref: { toggl2_api_key: ' toggl_sk_abc ', toggl2_organization_id: '9001', toggl2_workspace_id: '42' }
      }
    end

    assert_redirected_to '/my/account'
    pref = @user.reload.pref
    assert_equal('toggl_sk_abc', pref.toggl2_api_key)
    assert_equal('9001', pref.toggl2_organization_id)
    assert_equal('42', pref.toggl2_workspace_id)
  end

  test 'my account ignores Toggl 2.0 fields when disabled' do
    log_user(@user.login, @user.login)

    with_toggl2(false) do
      put '/my/account', params: {
        user: { firstname: @user.firstname, lastname: @user.lastname, mail: @user.mail },
        pref: { toggl2_api_key: 'toggl_sk_abc' }
      }
    end

    assert_redirected_to '/my/account'
    assert_nil(@user.reload.pref.toggl2_api_key)
  end

  test 'uses Toggl 2.0 when enabled and set up' do
    set_toggl2_pref(@user, 'toggl_sk_abc', '9001', '42')
    log_user(@user.login, @user.login)

    Toggl2Service.any_instance.expects(:load_workspaces).returns([TogglWorkspace.new(id: 42, name: 'W')])
    TogglService.any_instance.expects(:load_workspaces).never

    with_toggl2(true) { get '/toggl2redmine/toggl/workspaces' }

    assert_response :success
    assert_equal([{ 'id' => 42, 'name' => 'W' }], @response.parsed_body)
  end

  test 'asks for the organization and workspace IDs' do
    set_toggl2_pref(@user, 'toggl_sk_abc', '', '42')
    log_user(@user.login, @user.login)

    with_toggl2(true) { get '/toggl2redmine' }

    assert_redirected_to '/my/account'
    assert_equal(
      'To use Toggl 2.0, please add your Toggl 2.0 organization ID and workspace ID to your account.',
      flash[:error]
    )
  end

  test 'falls back to Toggl Track when Toggl 2.0 is disabled' do
    set_toggl2_pref(@user, 'toggl_sk_abc', '9001', '42')
    log_user(@user.login, @user.login)

    with_toggl2(false) { get '/toggl2redmine' }

    assert_redirected_to '/my/account'
    assert_equal('To use Toggl 2 Redmine, please add a Toggl API Token to your account.', flash[:error])
  end

  test 'links to Toggl 2.0 on the import page' do
    set_toggl2_pref(@user, 'toggl_sk_abc', '9001', '42')
    log_user(@user.login, @user.login)

    with_toggl2(true) { get '/toggl2redmine' }

    assert_response :success
    assert_select 'a#toggl-report-link[href=?][data-source=?]', 'https://focus.toggl.com', 'toggl2'
  end

  test 'imports Toggl 2.0 entries separately from Toggl Track ones' do
    set_toggl2_pref(@user, 'toggl_sk_abc', '9001', '42')
    log_user(@user.login, @user.login)

    # Toggl ID 1003 was already imported from Toggl Track.
    data = {
      toggl_ids: [1003],
      time_entry: {
        activity_id: enumerations(:activity_other).id,
        comments: 'Toggl 2.0 entry',
        hours: 1.0,
        issue_id: issues(:alpha_001).id,
        spent_on: '2021-01-17'
      }
    }

    with_toggl2(true) do
      assert_difference('TogglMapping.count', 1) do
        post '/toggl2redmine/import', params: data
      end
    end

    assert_response 201
    assert_equal(%w[toggl2 track], TogglMapping.where(toggl_id: 1003).pluck(:source).sort)
  end

  private

  def with_toggl2(enabled, &block)
    with_settings(plugin_toggl2redmine: { 'toggl2_enabled' => enabled ? '1' : '0' }, &block)
  end

  def set_toggl2_pref(user, api_key, organization_id, workspace_id)
    pref = user.pref
    pref.toggl2_api_key = api_key
    pref.toggl2_organization_id = organization_id
    pref.toggl2_workspace_id = workspace_id
    pref.save!
  end
end
