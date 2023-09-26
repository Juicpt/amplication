import { useCallback, useContext, useState } from "react";

import { Button, EnumButtonStyle } from "../Components/Button";
import * as models from "../models";

import {
  ConfirmationDialog,
  EnumTextColor,
  EnumTextStyle,
  EnumTextWeight,
  FlexItem,
  Icon,
  ListItem,
  Text,
  UserAndTime,
  EnumItemsAlign,
} from "@amplication/ui/design-system";
import ResourceCircleBadge from "../Components/ResourceCircleBadge";
import { gitProviderIconMap } from "../Resource/git/git-provider-icon-map";
import { AppContext } from "../context/appContext";

type Props = {
  resource: models.Resource;
  onDelete?: (resource: models.Resource) => void;
};

const CONFIRM_BUTTON = { label: "Delete" };
const DISMISS_BUTTON = { label: "Dismiss" };

function ResourceListItem({ resource, onDelete }: Props) {
  const { currentWorkspace, currentProject, setResource } =
    useContext(AppContext);
  const { id, name, description, gitRepository, resourceType } = resource;
  const [confirmDelete, setConfirmDelete] = useState<boolean>(false);

  const handleDelete = useCallback(
    (event) => {
      event.stopPropagation();
      event.preventDefault();
      setConfirmDelete(true);
      return false;
    },
    [setConfirmDelete]
  );

  const handleDismissDelete = useCallback(() => {
    setConfirmDelete(false);
  }, [setConfirmDelete]);

  const handleConfirmDelete = useCallback(() => {
    setConfirmDelete(false);
    onDelete && onDelete(resource);
  }, [onDelete, resource]);

  const handleClick = useCallback(() => {
    setResource(resource);
  }, [resource, setResource]);

  const lastBuild = resource.builds[0];

  const provider = gitRepository?.gitOrganization?.provider;

  const gitRepo =
    gitRepository && provider === models.EnumGitProvider.Github
      ? `${gitRepository.gitOrganization.name}/${gitRepository.name}`
      : provider === models.EnumGitProvider.Bitbucket
      ? `${gitRepository.groupName}/${gitRepository.name}`
      : undefined;

  return (
    <>
      <ConfirmationDialog
        isOpen={confirmDelete}
        title={`Delete '${name}' ?`}
        confirmButton={CONFIRM_BUTTON}
        dismissButton={DISMISS_BUTTON}
        message={
          <span>
            {resourceType === models.EnumResourceType.ProjectConfiguration
              ? "This will permanently delete the entire project and all its resources. Are you sure you want to continue?"
              : "This action cannot be undone. This will permanently delete the resource and its content. Are you sure you want to continue? "}
          </span>
        }
        onConfirm={handleConfirmDelete}
        onDismiss={handleDismissDelete}
      />
      <ListItem
        onClick={handleClick}
        to={`/${currentWorkspace?.id}/${currentProject?.id}/${id}`}
        start={<ResourceCircleBadge type={resource.resourceType} />}
        end={
          onDelete && (
            <Button
              buttonStyle={EnumButtonStyle.Text}
              icon="trash_2"
              onClick={handleDelete}
            />
          )
        }
      >
        <Text
          textStyle={EnumTextStyle.Normal}
          textWeight={EnumTextWeight.SemiBold}
        >
          {name}
        </Text>
        <Text textStyle={EnumTextStyle.Tag}>{name}</Text>
        <Text textStyle={EnumTextStyle.Subtle}>{description}</Text>

        {/* @todo: check whether we still need to use EllipsisText*/}
        {/* <EllipsisText
          className={`${CLASS_NAME}__description`}
          text={description}
          maxLength={350}
        /> */}
        <FlexItem itemsAlign={EnumItemsAlign.Center}>
          <Icon
            icon={gitProviderIconMap[provider || models.EnumGitProvider.Github]}
            size="small"
          />
          <Text textStyle={EnumTextStyle.Tag} textColor={EnumTextColor.White}>
            {gitRepo ? gitRepo : "Not connected"}
          </Text>

          <UserAndTime
            account={lastBuild?.commit?.user?.account || {}}
            time={lastBuild?.createdAt}
            label="Last commit:"
          />
        </FlexItem>
      </ListItem>
    </>
  );
}

export default ResourceListItem;
