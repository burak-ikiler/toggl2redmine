# frozen_string_literal: true

require_relative '../../test_helper'

class Toggl2ServiceTest < T2r::TestCase
  API_KEY = 'toggl_sk_foobar'

  test 'attribute readers' do
    subject = build_subject

    assert_equal(API_KEY, subject.api_key)
    assert_equal(9001, subject.organization_id)
    assert_equal(42, subject.workspace_id)
    assert_equal('toggl2', subject.source)
  end

  test '.load_time_entries reads all pages and maps entries' do
    start_date = Time.utc(2026, 10, 28)
    end_date = Time.utc(2026, 10, 28, 23, 59, 59)
    requests = []

    Net::HTTP
      .any_instance
      .expects(:request)
      .twice
      .with { |request| requests << request }
      .returns(
        mock_response('200', fixture('time_entries')),
        mock_response('200', { data: [], page: 2, per_page: 100 }.to_json)
      )

    result = build_subject.load_time_entries(start_date: start_date, end_date: end_date)

    first = requests.first
    assert_equal('focus.toggl.com', first.uri.host)
    assert_equal('/api/organizations/9001/workspaces/42/time-entries', first.uri.path)
    assert_equal(["Bearer #{API_KEY}"], first.to_hash['authorization'])
    assert_equal(['application/json'], first.to_hash['accept'])

    query = Rack::Utils.parse_query(first.uri.query)
    assert_equal('2026-10-28T00:00:00Z', query['date_from'])
    assert_equal('2026-10-28T23:59:59Z', query['date_to'])
    assert_equal('activity', query['type'])
    assert_equal('true', query['include_taskless'])
    assert_equal('1', query['page'])
    assert_equal('100', query['per_page'])
    assert_equal('2', Rack::Utils.parse_query(requests.last.uri.query)['page'])

    expected = [
      { id: 501, workspace_id: 42, duration: 1800, at: '2026-10-28T09:30:05Z', description: '#1 Preparing meal' },
      { id: 502, workspace_id: 42, duration: 600, at: '2026-10-28T10:10:05Z', description: '#2 Reticulating splines' },
      { id: 503, workspace_id: 42, duration: -1, at: '2026-10-28T11:00:01Z', description: '#1 Feeding the llamas' }
    ].map { |r| TogglTimeEntry.new(r.merge(source: 'toggl2')) }

    assert_equal(expected, result)
    assert(result.last.running?)
  end

  test '.load_time_entries returns nothing for another workspace' do
    Net::HTTP.any_instance.expects(:request).never

    result = build_subject.load_time_entries(start_date: Time.now, end_date: Time.now, workspace_id: 7)

    assert_equal([], result)
  end

  test '.load_time_entries raises Error with the message from Toggl' do
    body = { error: 'invalid_session', error_description: 'the provided API key is invalid' }.to_json
    Net::HTTP.any_instance.expects(:request).returns(mock_response('401', body))

    error = assert_raises(TogglService::Error) do
      build_subject.load_time_entries(start_date: Time.now, end_date: Time.now)
    end

    assert_equal('Toggl error: the provided API key is invalid.', error.message)
    assert_equal('401', error.response.code)
  end

  test '.load_workspaces returns the configured workspace' do
    Net::HTTP.any_instance.expects(:request).never

    assert_equal(
      [TogglWorkspace.new(id: 42, name: 'Toggl 2.0 workspace 42')],
      build_subject.load_workspaces
    )
  end

  private

  def build_subject
    Toggl2Service.new(API_KEY, '9001', '42')
  end

  def fixture(name)
    File.read(File.join(Toggl2Redmine.root, 'test', 'fixtures', 'toggl2', "#{name}.json"))
  end

  def mock_response(code, body)
    response = Net::HTTPResponse::CODE_TO_OBJ[code].new(1.1, code, '')
    response.stubs(:body).returns(body)
    response
  end
end
