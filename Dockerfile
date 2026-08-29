FROM node:22

WORKDIR /code

COPY ./package.json /code/package.json
COPY ./package-lock.json /code/package-lock.json
RUN npm ci

COPY . /code/.
# unit tests gate the deploy (e2e runs locally in the pre-commit hook: browsers are too heavy here)
RUN npm test
RUN npm run build
