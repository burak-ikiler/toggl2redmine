FROM redmine:6.0

ENV LANG=en_us

RUN apt update -qq > /dev/null \
  && apt install -qqy build-essential make vim less > /dev/null

# The base image skips the development and test gems.
COPY database.yml config/database.yml
RUN bundle config unset without \
  && bundle install --quiet \
  && chown -R redmine:redmine /home/redmine /usr/local/bundle

CMD ["rails", "server", "-b", "0.0.0.0"]
